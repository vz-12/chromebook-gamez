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
         -> the whole log, as a file, with the hidden pilot's code in it:
            dev accounts, and the accounts that hold the pilot it shows (the
            trailer's; nobody else's)
     GET ?list=1
         -> { broadcasts: [{ match, at, names }] }: the ones the same
            accounts may keep, newest first (pvp_broadcasts, below), for the
            lobby's REPLAYS card
     GET ?live=1
         -> { matches: [{ match, queue, league, names, pilots, hidden,
            practice, started, aired }] }: every match on now (now.js), for
            dev accounts only, for the lobby's ON NOW card
     POST { op: 'air', match }                    -> { ok }
         a dev watching a match that is not on air: its host is asked to
         start sending it (objects.js, Match op air; onair.js), and then may
     POST { op: 'practice', pilot }               -> { ok, id }
         practice against a bot put on air, to try the broadcast end to end
         with nobody else: a dev with any pilot, or a hidden pilot's holder
         flying it. Its id is the match the play page then sends

   pvp_broadcasts notes every match put on air, once, when its header is
   taken: the broadcast itself is the object, which cannot be listed.
   ========================================================================= */
import { sessionOf, originOk, clientIp, newId } from '../../src/auth.js';
import { vaultIds } from '../../src/vault.js';
import { isHidden, mayFly } from './hidden.js';
import { limited, tooMany } from './limits.js';
import { nowList } from './now.js';
import { PILOTS } from './rules.js';

const MAX_BODY = 128 * 1024, MAX_SNAP = 2 * 1024 * 1024, MAX_HEAD = 64 * 1024;
const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const isId = v => typeof v === 'string' && /^[0-9a-f]{32}$/.test(v);
const ask = (env, match, op, body) =>
  env.BROADCAST.get(env.BROADCAST.idFromName(match)).fetch('https://broadcast/' + op, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
const passOn = async res => new Response(await res.text(), { status: res.status,
  headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

const SCHEMA = `CREATE TABLE IF NOT EXISTS pvp_broadcasts (
     match    TEXT    PRIMARY KEY,
     pilot    TEXT    NOT NULL,           -- the hidden pilot it shows: its vault id
     by       TEXT    NOT NULL,           -- the account that put it on air
     started  INTEGER NOT NULL,
     names    TEXT    NOT NULL            -- the two players, as their handshakes named them (JSON)
   )`;
const ready = new WeakSet();
async function ensureBroadcasts(db) {
  if (ready.has(db)) return;
  await db.batch([db.prepare(SCHEMA), db.prepare('CREATE INDEX IF NOT EXISTS pvp_broadcasts_started ON pvp_broadcasts (started)')]);
  ready.add(db);
}
// who may keep a broadcast's log: dev accounts, and the accounts that hold its pilot
const keeps = (account, pilot) => (account.perks || []).includes('dev') || vaultIds(account.perks).includes(pilot);
export const mayKeepAny = account => (account.perks || []).includes('dev') || vaultIds(account.perks).length > 0;
// a dev account: watches whatever is on now (now.js)
export const isDev = account => (account.perks || []).includes('dev');

export default async function watch(req, env) {
  if (!env.BROADCAST) return reply({ error: 'no relay: bind the Broadcast object as BROADCAST' }, 503);
  if (req.method === 'GET') return view(req, env);
  if (req.method !== 'POST') return reply({ error: 'method not allowed' }, 405);
  return feed(req, env);
}

async function view(req, env) {
  const u = new URL(req.url), match = u.searchParams.get('match') || '';
  if (u.searchParams.get('list') === '1') {
    const s = await sessionOf(req, env, { peek: true });
    if (!s) return reply({ error: 'signed out' }, 401);
    if (!mayKeepAny(s.account)) return reply({ error: 'not yours to keep' }, 403);
    await ensureBroadcasts(env.DB);
    const rows = ((await env.DB.prepare('SELECT match, pilot, started, names FROM pvp_broadcasts ORDER BY started DESC LIMIT 200').all()).results || [])
      .filter(r => keeps(s.account, r.pilot)).slice(0, 50);
    const names = t => { try { const v = JSON.parse(t); return Array.isArray(v) ? v.map(String) : []; } catch (e) { return []; } };
    return reply({ broadcasts: rows.map(r => ({ match: r.match, at: r.started, names: names(r.names) })) });
  }
  if (u.searchParams.get('live') === '1') {
    const s = await sessionOf(req, env, { peek: true });
    if (!s) return reply({ error: 'signed out' }, 401);
    if (!isDev(s.account)) return reply({ error: 'dev accounts only' }, 403);
    const matches = await nowList(env.DB);
    await ensureBroadcasts(env.DB);
    const aired = new Set(matches.length
      ? ((await env.DB.prepare(`SELECT match FROM pvp_broadcasts WHERE match IN (${matches.map((_, i) => '?' + (i + 1)).join(', ')})`)
          .bind(...matches.map(x => x.match)).all()).results || []).map(r => r.match)
      : []);
    return reply({ matches: matches.map(x => Object.assign(x, { aired: aired.has(x.match) })) });
  }
  if (!isId(match)) return reply({ error: 'bad match' }, 400);
  if (u.searchParams.get('replay') === '1') {
    const s = await sessionOf(req, env, { peek: true });
    if (!s) return reply({ error: 'signed out' }, 401);
    const info = await (await ask(env, match, 'info', {})).json();
    if (!info.on) return reply({ error: 'not on air' }, 404);
    if (!keeps(s.account, info.pilot)) return reply({ error: 'not yours to keep' }, 403);
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
  const acct = s.account.id;
  if (b.op === 'practice') {
    const pilot = typeof b.pilot === 'string' ? b.pilot : '';
    const hidden = isHidden(pilot);
    if (hidden ? !(await mayFly(env.DB, s.account, pilot)) : !(isDev(s.account) && Object.prototype.hasOwnProperty.call(PILOTS, pilot)))
      return reply({ error: 'a dev account, or a hidden pilot\'s holder flying it' }, 403);
    const late = limited('open', acct);
    if (late) return tooMany(late);
    if (!env.MATCH) return reply({ error: 'no referee: bind the Match object as MATCH' }, 503);
    const id = newId();
    const res = await env.MATCH.get(env.MATCH.idFromName(id)).fetch('https://match/practice', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ id, acct, name: s.account.display || s.account.name, pilot, hidden }) });
    return res.ok ? reply({ ok: true, id }) : passOn(res);
  }
  if (!isId(b.match)) return reply({ error: 'bad match' }, 400);
  if (b.op === 'air') {
    if (!isDev(s.account)) return reply({ error: 'dev accounts only' }, 403);
    if (!env.MATCH) return reply({ error: 'no referee: bind the Match object as MATCH' }, 503);
    return passOn(await env.MATCH.get(env.MATCH.idFromName(b.match)).fetch('https://match/air', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' }));
  }

  if (b.op === 'head') {
    if (!b.head || typeof b.head !== 'object' || JSON.stringify(b.head).length > MAX_HEAD) return reply({ error: 'bad header' }, 400);
    if (typeof b.build !== 'string' || !/^[0-9a-z.]{1,40}$/.test(b.build)) return reply({ error: 'bad build' }, 400);
    if (!env.MATCH) return reply({ error: 'no referee: bind the Match object as MATCH' }, 503);
    // the match itself says which side this account is and what it flies: a hidden pilot, its own to fly
    const res = await env.MATCH.get(env.MATCH.idFromName(b.match)).fetch('https://match/peer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acct }) });
    const d = res.ok ? await res.json().catch(() => null) : null;
    // the side flying a hidden pilot of its own; or, in a match a dev has asked to watch (op air), its host
    const mine = d && d.ok && isHidden(d.pilot) && (await mayFly(env.DB, s.account, d.pilot));
    if (!mine && !(d && d.ok && d.air && d.side === 0))
      return reply({ error: 'only the side flying a hidden pilot, or the host of a match a dev watches, puts it on air' }, 403);
    const aired = await ask(env, b.match, 'head', { acct, match: b.match, pilot: d.pilot, head: b.head, build: b.build });
    // on air: noted once, for the lobby's list of what may be kept
    if (aired.ok) {
      const hl = Array.isArray(b.head.hellos) ? b.head.hellos : [];
      const names = JSON.stringify([0, 1].map(k => String((hl[k] && hl[k].name) || '').slice(0, 24)));
      await ensureBroadcasts(env.DB);
      await env.DB.prepare('INSERT OR IGNORE INTO pvp_broadcasts (match, pilot, by, started, names) VALUES (?1, ?2, ?3, ?4, ?5)')
        .bind(b.match, d.pilot, acct, Date.now(), names).run().catch(e => console.error('pvp broadcast note', e && e.message));
    }
    return passOn(aired);
  }
  if (b.op === 'in') return passOn(await ask(env, b.match, 'in', { acct, from: b.from, n: b.n, recs: b.recs, fps: b.fps }));
  if (b.op === 'snap') return passOn(await ask(env, b.match, 'snap', { acct, at: b.at, epoch: b.epoch, json: b.json }));
  if (b.op === 'end') return passOn(await ask(env, b.match, 'end', { acct, at: b.at, result: b.result, left: b.left }));
  return reply({ error: 'unknown op' }, 400);
}
