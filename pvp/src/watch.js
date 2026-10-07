/* ===========================================================================
   /api/pvp/watch — a match on air (live spectating, step 1): the feed in,
   viewers out, and the replay. The log itself is the match's Broadcast
   object (broadcast.js).

     POST { op: 'head', match, head, build }     -> { ok, next }
     POST { op: 'in', match, from, n, recs, fps } -> { ok, next } | 409 { need }
     POST { op: 'snap', match, at, epoch, json }  -> { ok }
     POST { op: 'end', match, at, result, left }  -> { ok }
         the feed: only from the account flying a hidden pilot in that match,
         one it holds (hidden.js), asked of the match itself as hidden.js
         does. The header settles who; the rest must come from the same
         account.

     GET ?match=<id>[&from=<step>][&snap=1][&v=<viewer>]
         -> { head?, snap?, from, batches, last, end, every }: anyone, no
            account (broadcast.js, view). Polled; `every` (ms) is how long
            the relay asks each viewer to wait before the next.
     GET ?match=<id>&replay=1
         -> the whole log, as a file: dev accounts, and the accounts that
            hold the pilot it shows (the trailer's; nobody else's)
   ========================================================================= */
import { sessionOf, originOk, clientIp } from '../../src/auth.js';
import { vaultIds } from '../../src/vault.js';
import { isHidden, mayFly } from './hidden.js';
import { limited, tooMany } from './limits.js';

const MAX_BODY = 128 * 1024, MAX_SNAP = 2 * 1024 * 1024, MAX_HEAD = 64 * 1024;
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const isId = v => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v);
const ask = (env, match, op, body) =>
  env.BROADCAST.get(env.BROADCAST.idFromName(match)).fetch('https://broadcast/' + op, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const passOn = async res => new Response(await res.text(), { status: res.status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async function watch(req, env) {
  if (!env.BROADCAST) return reply({ error: 'no relay: bind the Broadcast object as BROADCAST' }, 503);
  if (req.method === 'GET') return view(req, env);
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
  return feed(req, env);
}

async function view(req, env) {
  const u = new URL(req.url), match = u.searchParams.get('match') || '';
  if (!isId(match)) return reply({ error: 'bad match' }, 400);
  if (u.searchParams.get('replay') === '1') {
    const s = await sessionOf(req, env, { peek: true });
    if (!s) return reply({ error: 'signed out' }, 401);
    const info = await (await ask(env, match, 'info', {})).json();
    if (!info.on) return reply({ error: 'not on air' }, 404);
    const perks = s.account.perks || [];
    if (!perks.includes('dev') && !vaultIds(perks).includes(info.pilot)) return reply({ error: 'not yours to keep' }, 403);
    const res = await ask(env, match, 'replay', {});
    if (!res.ok) return passOn(res);
    return new Response(await res.text(), { headers: { 'content-type': 'application/json', 'cache-control': 'no-store',
      'content-disposition': 'attachment; filename="voidrunner-' + match.slice(0, 8) + '.replay.json"' } });
  }
  const wait = limited('view', clientIp(req));
  if (wait) return tooMany(wait);
  const from = u.searchParams.has('from') ? Number(u.searchParams.get('from')) : -1;
  const v = u.searchParams.get('v') || '';
  return passOn(await ask(env, match, 'view', { from: Number.isInteger(from) ? from : -1, snap: u.searchParams.get('snap') === '1',
                                                v: /^[0-9a-f]{16}$/.test(v) ? v : '' }));
}

async function feed(req, env) {
  if (!originOk(req)) return reply({ error: 'bad origin' }, 403);
  if (!/^application\/json/.test(req.headers.get('content-type') || '')) return reply({ error: 'json only' }, 415);
  const text = await req.text();
  if (text.length > MAX_SNAP) return reply({ error: 'too big' }, 413);
  let b;
  try { b = JSON.parse(text); } catch (e) { return reply({ error: 'bad json' }, 400); }
  if (!b || typeof b !== 'object') return reply({ error: 'bad json' }, 400);
  if (b.op !== 'snap' && text.length > MAX_BODY) return reply({ error: 'too big' }, 413);
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return reply({ error: 'signed out' }, 401);
  const wait = limited('feed', s.account.id);
  if (wait) return tooMany(wait);
  if (!isId(b.match)) return reply({ error: 'bad match' }, 400);
  const acct = s.account.id;

  if (b.op === 'head') {
    if (!b.head || typeof b.head !== 'object' || JSON.stringify(b.head).length > MAX_HEAD) return reply({ error: 'bad header' }, 400);
    if (typeof b.build !== 'string' || !/^[0-9a-z.]{1,40}$/.test(b.build)) return reply({ error: 'bad build' }, 400);
    if (!env.MATCH) return reply({ error: 'no referee: bind the Match object as MATCH' }, 503);
    // the match itself says which side this account is and what it flies: a hidden pilot, its own to fly
    const res = await env.MATCH.get(env.MATCH.idFromName(b.match)).fetch('https://match/peer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acct }) });
    const d = res.ok ? await res.json().catch(() => null) : null;
    if (!d || !d.ok || !isHidden(d.pilot) || !(await mayFly(env.DB, s.account, d.pilot)))
      return reply({ error: 'only the side flying a hidden pilot puts a match on air' }, 403);
    return passOn(await ask(env, b.match, 'head', { acct, match: b.match, pilot: d.pilot, head: b.head, build: b.build }));
  }
  if (b.op === 'in') return passOn(await ask(env, b.match, 'in', { acct, from: b.from, n: b.n, recs: b.recs, fps: b.fps }));
  if (b.op === 'snap') return passOn(await ask(env, b.match, 'snap', { acct, at: b.at, epoch: b.epoch, json: b.json }));
  if (b.op === 'end') return passOn(await ask(env, b.match, 'end', { acct, at: b.at, result: b.result, left: b.left }));
  return reply({ error: 'unknown op' }, 400);
}
