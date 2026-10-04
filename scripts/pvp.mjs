/* ===========================================================================
   THE PVP TEST — `npm run test:pvp`.

   Both Workers, the game's (src/index.js) and PvP's (pvp/src/index.js), on
   one real SQLite database (scripts/lib/d1-sqlite.mjs), the way they share
   one D1 in production. Plays the doors between them: a hand-off code from
   the game to PvP and back, the school address included; every way a code
   is refused; PvP's /api/pvp/me and the league's loadout; and that PvP makes
   no accounts of its own.

   No packages and no network. A few seconds, most of it scrypt.
   ========================================================================= */
import { makeD1 } from './lib/d1-sqlite.mjs';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { makeNamespace } from './lib/do-fake.mjs';

const main = (await import('../src/index.js')).default;
const pvp = (await import('../pvp/src/index.js')).default;
const { pruneAuth } = await import('../src/auth.js');
const { loadout, LEAGUES, CASUAL } = await import('../pvp/src/rules.js');
const { Match, Matchmaker, MM } = await import('../pvp/src/objects.js');
const { seasonOf } = await import('../src/season.js');
const { REF } = await import('../pvp/src/referee.js');

const DB = makeD1();
const asset = new Response('asset');
const envMain = { DB, ASSETS: { fetch: () => asset.clone() } };
// PvP's Worker as pvp/wrangler.jsonc sets it up (checked against the file below)
const envPvp = { DB, SIGNUP: 'off', ROOM_STORE: 'voidrunner-pvp-rooms', ASSETS: { fetch: () => new Response('pvp page') } };

const GAME = 'https://voidrunner.online', SCHOOL = 'https://voidrunner.play101.workers.dev';
const PVP = 'https://voidrunner-pvp.play101.workers.dev';
const WORKER = { [GAME]: [main, envMain], [SCHOOL]: [main, envMain], [PVP]: [pvp, envPvp],
                 'http://localhost:8787': [main, envMain], 'http://127.0.0.1:8788': [pvp, envPvp] };

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const one = q => DB.sql.prepare(q).get();
const sha = s => createHash('sha256').update(s).digest('hex');

/* A browser tab on one of the sites: its own cookie jar for that address. */
function tab(base, ip = '203.0.113.7') {
  const [worker, env] = WORKER[base];
  const d = { base, cookie: '' };
  d.call = async (method, path, body) => {
    const headers = { 'cf-connecting-ip': ip, origin: base, 'user-agent': 'Mozilla/5.0 (X11; CrOS x86_64) Chrome/120.0 Safari/537.36' };
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request(base + path, {
      method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    let data = null;
    try { data = await res.clone().json(); } catch (e) { data = await res.text().catch(() => null); }
    return { status: res.status, d: data, cookie: res.headers.get('set-cookie') || '' };
  };
  d.op = (op, b = {}) => d.call('POST', '/api/account', Object.assign({ op }, b));
  d.me = () => d.call('GET', '/api/pvp/me');
  return d;
}
const t0 = Date.now();

/* ---------------------------------------------------------------------- */
section('a player of the game, with a save');
const home = tab(GAME);
{
  const r = await home.op('register', { name: 'Duelist', pass: 'a fine password', pid: 'a'.repeat(32) });
  ok(r.status === 201, 'signed up in the game', r.status);
  const put = await home.call('PUT', '/api/account/save', { rev: 0, save: { best: 1 }, pid: 'a'.repeat(32),
    unlocks: { chars: ['runner', 'ember', 'hacker'], awake: ['ember', 'hacker'], chal: ['c1'], ups: ['u1', 'u2', 'u3'] } });
  ok(put.status === 200, 'and saved, with unlocks', put);
}

section('PvP signed out');
{
  const p = tab(PVP);
  const r = await p.me();
  ok(r.status === 401, '/api/pvp/me: signed out', r);
  const page = await p.call('GET', '/');
  ok(page.d === 'pvp page', 'the page is PvP\'s own files', page.d);
  const up = await p.op('register', { name: 'pvp_only', pass: 'a fine password' });
  ok(up.status === 403 && /VOIDRUNNER/.test(up.d.error), 'no accounts are made here', up);
  ok(one("SELECT COUNT(*) AS n FROM accounts WHERE name = 'pvp_only'").n === 0, 'none was');
  ok((await p.call('GET', '/api/pvp/queue')).status === 405, '/api/pvp/queue answers (POST only)');
  ok((await p.call('GET', '/api/nope')).status === 404, 'an unknown API path');
  ok((await p.call('GET', '/api/account/save')).status === 404, 'the save is the game\'s, not PvP\'s');
}

section('through the door: the game to PvP');
const duel = tab(PVP);
{
  const h = await home.op('handoff', { to: PVP });
  ok(h.status === 200 && /^[A-Za-z0-9_-]{43}$/.test(h.d.code) && h.d.to === PVP, 'a code for PvP', h.d);
  ok(one(`SELECT COUNT(*) AS n FROM handoffs WHERE id = '${sha(h.d.code)}'`).n === 1, 'kept as its hash');
  ok(!JSON.stringify(DB.sql.prepare('SELECT * FROM handoffs').all()).includes(h.d.code), 'never as itself');
  const t = await duel.op('handoff-take', { code: h.d.code });
  ok(t.status === 200 && t.d.account.name === 'duelist' && /^vr_s=/.test(t.cookie), 'PvP signs the player in', t);
  ok(!/Domain=/.test(t.cookie) && /Secure/.test(t.cookie), 'on PvP\'s own address only', t.cookie);
  ok(duel.cookie !== home.cookie, 'with a session of its own');
  ok(one(`SELECT COUNT(*) AS n FROM handoffs WHERE id = '${sha(h.d.code)}'`).n === 0, 'and the code is spent');
  const again = await tab(PVP).op('handoff-take', { code: h.d.code });
  ok(again.status === 401, 'a spent code is nothing', again.status);
}

section('/api/pvp/me');
{
  const r = await duel.me();
  ok(r.status === 200 && r.d.account.display === 'Duelist', 'who you are', r.d);
  ok(r.d.unlocks && r.d.unlocks.chars.includes('hacker'), 'what you have unlocked, from the game\'s save', r.d.unlocks);
  ok(r.d.league.id === 'bronze' && r.d.league.provisional === true, 'the lowest league, to be placed', r.d.league);
  ok(r.d.league.bestOf === 3, 'whose ranked matches are best of three', r.d.league);
  const { ranked, casual } = r.d.loadouts;
  ok(ranked.pilots.join() === 'runner,ember' && ranked.awake.length === 0, 'bronze: the base pilots, none awake', ranked);
  ok(ranked.ups.join() === 'u1,u2,u3', 'and the reward upgrades, in every league', ranked.ups);
  ok(casual.pilots.join() === 'runner,ember,hacker' && casual.awake.join() === 'ember,hacker', 'casual: everything unlocked', casual);
  ok(!/[0-9a-f]{32}/.test(JSON.stringify(r.d)), 'no ids or pids in the reply');
}

section('the league tables');
{
  const u = { chars: ['runner', 'ember', 'melee', 'not-a-pilot'], awake: ['melee', 'ember'], ups: ['x'] };
  const plat = loadout(LEAGUES.find(l => l.id === 'platinum'), u);
  ok(plat.pilots.join() === 'runner,ember,melee' && plat.awake.join() === 'ember,melee', 'platinum: everything goes', plat);
  const gold = loadout(LEAGUES.find(l => l.id === 'gold'), u);
  ok(gold.pilots.join() === 'runner,ember' && !gold.awake.length, 'gold: base only, never awake', gold);
  const none = loadout(CASUAL, null);
  ok(none.pilots.join() === 'runner,ember' && !none.ups.length, 'no save yet: the base pilots', none);
  ok(LEAGUES.every((l, i) => !i || l.from > LEAGUES[i - 1].from), 'the leagues climb');
  ok(LEAGUES.map(l => l.id + ':' + l.bestOf).join() === 'bronze:3,silver:3,gold:5,platinum:5,void:5' && CASUAL.bestOf === 3,
     'best of three until gold, five from there; casual three', LEAGUES.map(l => l.bestOf));
}

section('back through the door: PvP to wherever the player came from');
{
  // a player on a school network came in from the school address
  const school = tab(SCHOOL, '198.51.100.40');
  const h = await duel.op('handoff', { to: SCHOOL });
  ok(h.status === 200, 'PvP hands back to the school address', h.status);
  const t = await school.op('handoff-take', { code: h.d.code });
  ok(t.status === 200 && t.d.account.name === 'duelist', 'signed in there', t);
  ok((await school.call('GET', '/api/account')).d.account.name === 'duelist', 'and the game knows it');

  const h2 = await duel.op('handoff', { to: GAME });
  const before = one('SELECT COUNT(*) AS n FROM sessions').n;
  const t2 = await home.op('handoff-take', { code: h2.d.code });
  ok(t2.status === 200 && t2.d.already === true && !t2.cookie, 'already signed in as them: nothing changes', t2);
  ok(one('SELECT COUNT(*) AS n FROM sessions').n === before, 'and no new session is made');
}

section('every way a code is refused');
{
  const other = tab(GAME, '192.0.2.9');
  ok((await other.op('register', { name: 'someone_else', pass: 'a fine password' })).status === 201, 'another player');
  let h = await duel.op('handoff', { to: GAME });
  let t = await other.op('handoff-take', { code: h.d.code });
  ok(t.status === 409 && t.d.here === 'someone_else' && t.d.as === 'Duelist' && !t.cookie,
     'signed in there as somebody else: not taken, and the answer names both, for the page to ask', t);
  ok((await other.call('GET', '/api/account')).d.account.name === 'someone_else', 'and they stay who they were');
  ok(one(`SELECT COUNT(*) AS n FROM handoffs WHERE id = '${sha(h.d.code)}'`).n === 1, 'the code is left unspent');
  const otherSessions = () => one("SELECT COUNT(*) AS n FROM sessions s JOIN accounts a ON a.id = s.account WHERE a.name = 'someone_else'").n;
  const was = otherSessions();
  t = await other.op('handoff-take', { code: h.d.code, switch: true });
  ok(t.status === 200 && t.d.switched === true && t.d.account.name === 'duelist' && /vr_s=/.test(t.cookie), 'asked to switch: signed in as the code\'s account', t);
  ok((await other.call('GET', '/api/account')).d.account.name === 'duelist' && otherSessions() === was - 1,
     'and the one who was there is signed out of this browser, not elsewhere', [otherSessions(), was]);
  ok((await other.op('handoff-take', { code: h.d.code, switch: true })).status === 401, 'a switch spends the code');

  h = await home.op('handoff', { to: PVP });
  t = await tab(SCHOOL).op('handoff-take', { code: h.d.code });
  ok(t.status === 401, 'taken at an address it was not for', t.status);
  t = await tab(PVP).op('handoff-take', { code: h.d.code });
  ok(t.status === 401, 'and spent by trying', t.status);

  h = await home.op('handoff', { to: PVP });
  DB.sql.prepare('UPDATE handoffs SET expires = ? WHERE id = ?').run(Date.now() - 1, sha(h.d.code));
  t = await tab(PVP).op('handoff-take', { code: h.d.code });
  ok(t.status === 401, 'a minute old', t.status);

  for (const code of ['', 'short', 'x'.repeat(65), '../../etc', 'a'.repeat(43)])
    ok((await tab(PVP).op('handoff-take', { code })).status === 401, 'not a code: ' + JSON.stringify(code).slice(0, 20));

  for (const [to, why] of [['https://evil.example', 'somewhere else'], [GAME, 'the address asking'],
                           [PVP + '/', 'with a path'], [PVP + '/#h=1', 'with more after it'],
                           ['https://www.voidrunner.online', 'www, which only forwards'],
                           ['http://127.0.0.1:8788', 'localhost, from the real site'], ['', 'nowhere'],
                           ['javascript:alert(1)', 'not an address']]) {
    const r = await home.op('handoff', { to });
    ok(r.status === 400, 'no code for ' + why, r.status);
  }
  const out = await tab(GAME).op('handoff', { to: PVP });
  ok(out.status === 401, 'signed out: no code', out.status);
}

section('a local wrangler dev, between its own two addresses');
{
  const lg = tab('http://localhost:8787', '127.0.0.1');
  ok((await lg.op('login', { name: 'duelist', pass: 'a fine password' })).status === 200, 'signed in to the local game');
  const h = await lg.op('handoff', { to: 'http://127.0.0.1:8788' });
  ok(h.status === 200, 'a code for the local PvP', h.status);
  const lp = tab('http://127.0.0.1:8788', '127.0.0.1');
  const t = await lp.op('handoff-take', { code: h.d.code });
  ok(t.status === 200 && !/Secure/.test(t.cookie), 'taken there, on plain http', t);
  ok((await lp.me()).d.account.name === 'duelist', 'and PvP knows who it is');
}

section('the daily sweep');
{
  const h = await home.op('handoff', { to: PVP });
  DB.sql.prepare('UPDATE handoffs SET expires = ?').run(Date.now() - 1);
  await pruneAuth(envMain);
  ok(one('SELECT COUNT(*) AS n FROM handoffs').n === 0, 'lapsed codes are swept', h.status);
}

section('match rooms: PvP\'s own');
{
  const cfg = readFileSync(new URL('../pvp/wrangler.jsonc', import.meta.url), 'utf8');
  ok(/"ROOM_STORE":\s*"voidrunner-pvp-rooms"/.test(cfg), 'the Worker is set up with its own room store, as tested here');
  ok(/"binding":\s*"GAME",\s*"service":\s*"voidrunner"/.test(cfg), 'and bound to the game\'s Worker for the relay');
  const host = tab(PVP, '198.51.100.70');
  const r = await host.call('POST', '/api/room', { offer: 'v=0 pvp-offer' });
  ok(r.status === 200 && /^[A-Z0-9]{4}$/.test(r.d.code), 'a PvP host opens a room', r);
  const g = await tab(PVP, '198.51.100.71').call('GET', '/api/room?code=' + r.d.code + '&as=guest');
  ok(g.status === 200 && g.d.peer && g.d.peer.offer === 'v=0 pvp-offer', 'a PvP guest finds it by its code', g.d);
  const m = await tab(GAME).call('GET', '/api/room?code=' + r.d.code + '&as=guest');
  ok(m.status === 404, 'the game\'s co-op never finds it', m.status);
  const gr = await tab(GAME).call('POST', '/api/room', { offer: 'v=0 game-offer' });
  ok(gr.status === 200, 'a co-op room in the game', gr.status);
  const p = await tab(PVP).call('GET', '/api/room?code=' + gr.d.code + '&as=guest');
  ok(p.status === 404, 'nor does PvP find the game\'s', p.status);
}

section('the relay, asked of the game\'s Worker');
{
  ok((await tab(PVP).call('GET', '/api/turn')).status === 503, 'no binding (a local dev on its own): no relay, and the engine connects directly');
  const seen = [];
  envPvp.GAME = { fetch: async req => {
    seen.push({ url: req.url, ip: req.headers.get('cf-connecting-ip'), cookie: req.headers.get('cookie') });
    return new Response(JSON.stringify({ ok: true, iceServers: [{ urls: ['turn:turn.example:3478'], username: 'u', credential: 'c' }], ttl: 43200 }),
                        { headers: { 'content-type': 'application/json' } });
  } };
  const pl = tab(PVP, '203.0.113.99');
  await pl.op('login', { name: 'duelist', pass: 'a fine password' });
  const r = await pl.call('GET', '/api/turn');
  ok(r.status === 200 && r.d.iceServers[0].username === 'u', 'the game\'s answer, passed on', r.d);
  ok(seen.length === 1 && seen[0].url === 'https://voidrunner.online/api/turn' && seen[0].ip === '203.0.113.99',
     'asked as the player, from their own address, so the game\'s cap counts them', seen);
  ok(!seen[0].cookie, 'and no session of PvP\'s goes with it', seen[0]);
  envPvp.GAME = { fetch: async () => { throw new Error('down'); } };
  ok((await tab(PVP).call('GET', '/api/turn')).status === 502, 'the game unreachable: 502');
  ok((await tab(PVP).call('POST', '/api/turn', {})).status === 405, 'only GET');
  delete envPvp.GAME;
}

section('the referee: a match, both sides, and what it comes to');
{
  const cfg = readFileSync(new URL('../pvp/wrangler.jsonc', import.meta.url), 'utf8');
  ok(/"name":\s*"MATCH",\s*"class_name":\s*"Match"/.test(cfg), 'the Worker binds the Match object as MATCH, as tested here');
  envPvp.MATCH = makeNamespace(Match, envPvp);
  // a second player and a stranger, each signed in at PvP
  for (const [name, ip] of [['Rival', '198.51.100.90'], ['Stranger', '198.51.100.91']]) {
    const r = await tab(GAME, ip).op('register', { name, pass: 'a fine password', pid: (name === 'Rival' ? 'b' : 'c').repeat(32) });
    ok(r.status === 201, name + ' signed up in the game', r.status);
  }
  const rival = tab(PVP, '198.51.100.90'), stranger = tab(PVP, '198.51.100.91');
  ok((await rival.op('login', { name: 'rival', pass: 'a fine password' })).status === 200
     && (await stranger.op('login', { name: 'stranger', pass: 'a fine password' })).status === 200, 'and at PvP');
  const acct = n => one(`SELECT id FROM accounts WHERE name = '${n}'`).id;
  const ids = [acct('duelist'), acct('rival'), acct('stranger')];
  const mt = (t, b) => t.call('POST', '/api/pvp/match', b);
  const rep = (t, id, report) => mt(t, { op: 'report', id, report });
  // fingerprints for steps from..to, one a second; `bent` changes the hash at one step
  const fps = (from, to, bent = -1) => {
    const out = [];
    for (let s = from; s <= to; s += 60) out.push([0, s, (s * 2654435761 + (s === bent ? 1 : 0)) >>> 0]);
    return out;
  };
  const real = Date.now;
  let clock = real();
  Date.now = () => clock;
  const later = ms => { clock += ms; };
  const rows = id => DB.sql.prepare('SELECT * FROM pvp_matches WHERE id = ?').all(id);
  const flags = id => DB.sql.prepare('SELECT account, reason FROM pvp_flags WHERE match = ? ORDER BY account').all(id);
  const won = { winner: 0, score: [2, 1], bestOf: 3 };
  // a match, opened by the duelist and joined by the rival
  const pair = async () => {
    const o = await mt(duel, { op: 'open', kind: 'friend', pilot: 'hacker' });
    const j = await mt(rival, { op: 'join', id: o.d.id, pilot: 'ember' });
    return o.d.id;
  };

  // who may ask, and how
  ok((await tab(PVP).call('POST', '/api/pvp/match', { op: 'open', kind: 'friend', pilot: 'runner' })).status === 401, 'signed out: 401');
  ok((await duel.call('GET', '/api/pvp/match')).status === 405, 'only POST');
  ok((await tab(PVP).call('POST', '/api/pvp/queue', { op: 'join', queue: 'casual', pilot: 'runner' })).status === 401, 'matchmaking, signed out: 401');
  ok((await mt(duel, { op: 'open', kind: 'ranked', pilot: 'runner' })).status === 400, 'a player opens only a friend\'s match');
  ok((await mt(duel, { op: 'open', kind: 'friend', pilot: 'nobody' })).status === 400, 'with a real pilot');
  ok((await mt(duel, { op: 'join', id: 'nope', pilot: 'runner' })).status === 400, 'a match id is a match id');
  ok((await mt(duel, { op: 'join', id: 'f'.repeat(32), pilot: 'runner' })).status === 404, 'a match nobody opened');

  // a match played to the end, both sides agreeing
  const o = await mt(duel, { op: 'open', kind: 'friend', pilot: 'hacker' });
  ok(o.status === 200 && /^[0-9a-f]{32}$/.test(o.d.id) && o.d.side === 0 && o.d.peer === null, 'the host opens one, and waits', o.d);
  const id = o.d.id;
  const self = await mt(duel, { op: 'join', id, pilot: 'hacker' });
  ok(self.status === 200 && self.d.side === 0 && self.d.peer === null, 'the host joining its own is still the host, still alone', self.d);
  const j = await mt(rival, { op: 'join', id, pilot: 'ember' });
  ok(j.status === 200 && j.d.side === 1 && j.d.peer.name === 'Duelist' && j.d.peer.pilot === 'hacker', 'the guest joins, and sees who it is up against', j.d);
  ok(!ids.some(a => JSON.stringify(j.d).includes(a)), 'never their account');
  ok((await mt(stranger, { op: 'join', id, pilot: 'runner' })).status === 409, 'a third: the match is full');
  ok((await rep(stranger, id, {})).status === 403, 'nor can a stranger report on it');
  for (const bad of [{ fps: 'x' }, { fps: [[0, 1]] }, { fps: Array(61).fill([0, 1, 1]) },
                     { result: { winner: 0, score: [1, 2], bestOf: 3 } }, { result: { winner: 1, score: [0, 3], bestOf: 3 } },
                     { result: { winner: 0, score: [2, 0], bestOf: 4 } }])
    ok((await rep(duel, id, bad)).status === 400, 'a malformed report is refused: ' + JSON.stringify(bad).slice(0, 50));
  for (let t = 0; t < 4; t++) {
    later(5000);
    const a = await rep(duel, id, { fps: fps(t * 300, t * 300 + 299), tick: t * 300 + 299 });
    const b = await rep(rival, id, { fps: fps(t * 300, t * 300 + 299), tick: t * 300 + 299 });
    if (a.d.verdict || b.d.verdict) ok(false, 'nothing decided mid-match', [a.d, b.d]);
  }
  later(5000);
  const r1 = await rep(duel, id, { fps: fps(1200, 1400), result: won });
  ok(r1.status === 200 && r1.d.verdict === null, 'one result: waiting for the other', r1.d);
  const r2 = await rep(rival, id, { fps: fps(1200, 1400), result: won });
  ok(r2.d.verdict && r2.d.verdict.v === 'played' && r2.d.verdict.winner === 0 && r2.d.verdict.score.join() === '2,1', 'both agree: the result stands', r2.d);
  const r3 = await rep(duel, id, { result: { winner: 1, score: [0, 2], bestOf: 3 } });
  ok(r3.d.verdict.v === 'played' && r3.d.verdict.winner === 0, 'and nothing said afterwards changes it', r3.d.verdict);
  const row = rows(id)[0];
  ok(row && row.verdict === 'played' && row.winner === 0 && row.score_a === 2 && row.score_b === 1 && row.best_of === 3, 'recorded: the winner and the score', row);
  ok(row.a === ids[0] && row.b === ids[1] && row.a_pilot === 'hacker' && row.b_pilot === 'ember', 'who played whom, flying what', row);
  ok(row.queue === 'friend' && row.rated === 0 && /^\d{4}-\d{2}$/.test(row.season) && row.ended >= row.started, 'a friend\'s match, unrated, in its season', row);
  ok(flags(id).length === 0, 'and nobody flagged');

  // the ways it is no contest
  const fp = await pair();
  later(5000); await rep(duel, fp, { fps: fps(0, 600) });
  const fv = await rep(rival, fp, { fps: fps(0, 600, 360) });
  ok(fv.d.verdict && fv.d.verdict.v === 'void', 'the fingerprints differ at one step: no contest', fv.d);
  ok(rows(fp)[0].reason === 'fingerprints' && flags(fp).map(f => f.account).join() === [ids[0], ids[1]].sort().join(), 'recorded, and both flagged', [rows(fp)[0], flags(fp)]);
  const pp = await pair();
  later(5000); await rep(duel, pp, { fps: fps(0, 300) });
  const pv = await rep(rival, pp, { fps: fps(0, 300), parted: true });
  ok(pv.d.verdict.v === 'void' && rows(pp)[0].reason === 'parted' && flags(pp).length === 2, 'a side whose game parted: no contest', pv.d);
  const rp = await pair();
  await rep(duel, rp, { result: won });
  const rv = await rep(rival, rp, { result: { winner: 1, score: [1, 2], bestOf: 3 } });
  ok(rv.d.verdict.v === 'void' && rows(rp)[0].reason === 'results', 'the two results disagree: no contest', rv.d);
  const dp = await pair();
  await rep(duel, dp, { alone: true });
  const dv = await rep(rival, dp, { alone: true });
  ok(dv.d.verdict.v === 'void' && rows(dp)[0].reason === 'dropped' && flags(dp).length === 2, 'both lost the link: no contest, flagged as dropped', dv.d);
  const kp = await pair();
  later(5000); await rep(duel, kp, { fps: fps(0, 300) });
  const kv = await rep(rival, kp, { fps: fps(0, 300), broke: true });
  ok(kv.d.verdict.v === 'void' && rows(kp)[0].reason === 'rules' && flags(kp).length === 2,
     'a side that saw the match break its rules (a ranked guest, of the host\'s start): no contest, both flagged', kv.d);

  // leaving
  const lp = await pair();
  later(5000); await rep(duel, lp, { fps: fps(0, 300) }); await rep(rival, lp, { fps: fps(0, 300) });
  for (let t = 0; t < 9; t++) { later(5000); await rep(duel, lp, { fps: fps(360 + t * 300, 600 + t * 300), alone: t > 0 }); }
  later(5000);
  const lv = await rep(duel, lp, { alone: true });
  ok(lv.d.verdict && lv.d.verdict.v === 'forfeit' && lv.d.verdict.winner === 0, 'the guest went quiet mid-match and the host stayed: the guest forfeits', lv.d);
  ok(rows(lp)[0].verdict === 'forfeit' && rows(lp)[0].winner === 0 && flags(lp).length === 0, 'recorded as a forfeit, nobody flagged', rows(lp)[0]);
  const ap = await pair();
  later(1000); await rep(rival, ap, { fps: fps(0, 300) });
  later(40000); await rep(rival, ap, { fps: fps(360, 600), alone: true });
  later(6000); await envPvp.MATCH.alarms();
  ok(rows(ap).length === 0, 'a side yet to report has longer than the grace: its connect time', rows(ap));
  later(40000); await rep(rival, ap, { fps: fps(660, 900), alone: true });
  later(5000);
  const fired = await envPvp.MATCH.alarms();
  ok(fired >= 1 && rows(ap)[0] && rows(ap)[0].verdict === 'forfeit' && rows(ap)[0].winner === 1,
     'with nobody reporting, the object\'s alarm decides it: the host that never reported forfeits once that is out', rows(ap));
  const op = await pair();
  later(5000); await rep(rival, op, { fps: fps(0, 300) });
  await rep(duel, op, { fps: fps(0, 300), result: won });
  later(46000); await envPvp.MATCH.alarms();
  ok(rows(op)[0] && rows(op)[0].verdict === 'played' && rows(op)[0].reason === 'one result', 'one result, and the other left without saying: it stands', rows(op));
  const bp = await pair();
  later(REF.CONNECT + 1000); await envPvp.MATCH.alarms();
  ok(rows(bp).length === 0, 'both quiet: abandoned, and nothing recorded');
  const qp = await pair();
  later(5000); await rep(duel, qp, { fps: fps(0, 300) }); await rep(rival, qp, { fps: fps(0, 300) });
  later(2000);
  const qv = await rep(rival, qp, { fps: fps(360, 420), left: true });
  ok(qv.d.verdict && qv.d.verdict.v === 'forfeit' && qv.d.verdict.winner === 0, 'a player who quits says so on the way out: a forfeit at once', qv.d);
  ok(rows(qp)[0].verdict === 'forfeit' && rows(qp)[0].reason === 'quit' && flags(qp).length === 0, 'recorded as a quit, nobody flagged', rows(qp)[0]);
  const sp = await pair();
  later(5000); await rep(duel, sp, { fps: fps(0, 300) }); await rep(rival, sp, { fps: fps(0, 300) });
  later(5000); await rep(duel, sp, { fps: fps(360, 600), alone: true });
  later(46000); await envPvp.MATCH.alarms();
  ok(rows(sp)[0] && rows(sp)[0].verdict === 'forfeit' && rows(sp)[0].winner === 0,
     'the guest went without a word, the host saw it and went too: still the guest\'s forfeit', rows(sp));
  const hp = await pair();
  later(5000); await rep(duel, hp, { fps: fps(0, 300) }); await rep(rival, hp, { fps: fps(0, 300) });
  later(5000); await rep(duel, hp, { fps: fps(360, 600), result: won });
  for (let t = 0; t < 12; t++) { later(5000); await rep(rival, hp, { fps: fps(660 + t * 300, 900 + t * 300) }); }
  ok(rows(hp).length === 0, 'one result, the other still playing a minute on: it does not stand early');
  later(REF.MAX_MATCH); await rep(rival, hp, {});
  ok(rows(hp)[0] && rows(hp)[0].verdict === 'played' && rows(hp)[0].reason === 'one result',
     'but holding the other result back forever does not hold the verdict: it stands once the match runs out its time', rows(hp));

  // nobody came, and tidying up
  const ep = (await mt(duel, { op: 'open', kind: 'friend', pilot: 'runner' })).d.id;
  later(31 * 60 * 1000 + 2000); await envPvp.MATCH.alarms();
  ok((await mt(rival, { op: 'join', id: ep, pilot: 'ember' })).status === 404, 'a friend\'s match nobody joined in half an hour is let go');
  later(2000); await envPvp.MATCH.alarms();
  ok(envPvp.MATCH.instances.get(ep).data.size === 0 && rows(ep).length === 0, 'its object emptied, nothing recorded');
  later(11 * 60 * 1000); await envPvp.MATCH.alarms();
  ok(envPvp.MATCH.instances.get(id).data.size === 0, 'a verdict is kept ten minutes for late reports, then the object empties');
  ok((await rep(duel, id, {})).status === 404, 'after which the match is gone; its row stays');

  // a database hiccup at the verdict: written at the next look
  const wp = await pair();
  const batch = DB.batch;
  DB.batch = async () => { throw new Error('D1 down'); };
  const cerr = console.error; console.error = () => {};    // the object logs the failed write; expected here
  await rep(duel, wp, { result: won });
  const wv = await rep(rival, wp, { result: won });
  DB.batch = batch; console.error = cerr;
  ok(wv.d.verdict.v === 'played' && rows(wp).length === 0, 'decided, but the write failed', wv.d);
  later(16000); await envPvp.MATCH.alarms();
  ok(rows(wp).length === 1 && rows(wp)[0].verdict === 'played', 'and the next look writes it', rows(wp));
  Date.now = real;
}

section('matchmaking: the queues, the pairing, and the ratings');
{
  const cfg = readFileSync(new URL('../pvp/wrangler.jsonc', import.meta.url), 'utf8');
  ok(/"name":\s*"MATCHMAKER",\s*"class_name":\s*"Matchmaker"/.test(cfg), 'the Worker binds the Matchmaker as MATCHMAKER, as tested here');
  envPvp.MATCHMAKER = makeNamespace(Matchmaker, envPvp);
  const real = Date.now;
  let clock = real();
  Date.now = () => clock;
  const later = ms => { clock += ms; };

  /* The players: the duelist (HACKER unlocked, EMBER and HACKER awake), the
     rival and the stranger (no save: the base pilots only), and two made
     here, ACE with everything and BOLT with nothing. */
  for (const [name, ip, pid, unlocks] of [
    ['Ace', '198.51.100.92', 'd', { chars: ['runner', 'ember', 'hacker', 'melee'], awake: ['hacker', 'melee'], chal: [], ups: ['u9'] }],
    ['Bolt', '198.51.100.93', 'e', null]]) {
    const g = tab(GAME, ip);
    ok((await g.op('register', { name, pass: 'a fine password', pid: pid.repeat(32) })).status === 201, name + ' signed up in the game');
    if (unlocks) ok((await g.call('PUT', '/api/account/save', { rev: 0, save: { best: 1 }, pid: pid.repeat(32), unlocks })).status === 200, name + ' saved, with unlocks');
  }
  const login = async (name, ip) => {
    const t = tab(PVP, ip);
    ok((await t.op('login', { name, pass: 'a fine password' })).status === 200, name + ' signs in at PvP');
    return t;
  };
  const rival = await login('rival', '198.51.100.90'), stranger = await login('stranger', '198.51.100.91');
  const ace = await login('ace', '198.51.100.92'), bolt = await login('bolt', '198.51.100.93');
  const acct = n => one(`SELECT id FROM accounts WHERE name = '${n}'`).id;
  const ids = ['duelist', 'rival', 'stranger', 'ace', 'bolt'].map(acct);
  const qq = (t, b) => t.call('POST', '/api/pvp/queue', b);
  const join = (t, queue, pilot) => qq(t, { op: 'join', queue, pilot });
  const poll = (t, queue) => qq(t, { op: 'poll', queue });
  const mt = (t, b) => t.call('POST', '/api/pvp/match', b);
  const rating = n => DB.sql.prepare('SELECT * FROM pvp_ratings WHERE account = ? AND queue = ? AND season = ?').get(acct(n), 'ranked', seasonOf(clock));
  const setRating = (n, r, games) => DB.sql.prepare(
    `INSERT INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
     VALUES (?, 'ranked', ?, ?, 80, 0.06, ?, ?, 0, NULL, ?)
     ON CONFLICT (account, queue, season) DO UPDATE SET rating = excluded.rating, rd = 80, games = excluded.games, wins = excluded.wins`)
    .run(acct(n), seasonOf(clock), r, games, games, clock);
  const row = id => DB.sql.prepare('SELECT * FROM pvp_matches WHERE id = ?').get(id);
  const hash = s => (s * 2654435761) >>> 0;
  const won0 = { winner: 0, score: [2, 0], bestOf: 3 };
  // a queued match, to its verdict: the same fingerprints from both, then the same result
  const playOut = async (h, g, id, result) => {
    later(5000);
    for (const t of [h, g]) await mt(t, { op: 'report', id, report: { fps: [[0, 60, hash(60)], [0, 120, hash(120)]], tick: 120 } });
    later(5000);
    await mt(h, { op: 'report', id, report: { result } });
    return mt(g, { op: 'report', id, report: { result } });
  };
  // both poll every four seconds, as the lobby does, until both are matched or `secs` is up
  const wait = async (a, b, queue, secs) => {
    let ra, rb;
    for (let s = 0; s <= secs; s += 4) {
      ra = await poll(a, queue); rb = await poll(b, queue);
      if (ra.d.state === 'matched' && rb.d.state === 'matched') return [ra.d.match, rb.d.match, s];
      later(4000); await envPvp.MATCHMAKER.alarms();
    }
    return [null, null, secs, ra.d, rb.d];
  };

  // who may queue, and with what
  ok((await duel.call('GET', '/api/pvp/queue')).status === 405, 'only POST');
  ok((await qq(duel, { op: 'join', queue: 'arena', pilot: 'runner' })).status === 400, 'an unknown queue');
  ok((await qq(duel, { op: 'dance', queue: 'ranked' })).status === 400, 'an unknown op');
  ok((await join(duel, 'ranked', 'nobody')).status === 400, 'a real pilot');
  const hk = await join(duel, 'ranked', 'hacker');
  ok(hk.status === 400 && /BRONZE/.test(hk.d.error), 'ranked flies the league\'s pilots: still being placed, that is BRONZE\'s base two', hk.d);
  const rh = await join(rival, 'casual', 'hacker');
  ok(rh.status === 400 && /unlocked/.test(rh.d.error), 'casual flies what the account owns, and no more', rh.d);

  // two in ranked, both still to be placed: paired at once, the older one hosting
  const w = await join(duel, 'ranked', 'ember');
  ok(w.status === 200 && w.d.state === 'waiting', 'the first waits', w.d);
  later(1000);
  const j = await join(rival, 'ranked', 'runner');
  ok(j.d.state === 'matched' && j.d.match.role === 'guest' && j.d.match.side === 1, 'the second is paired with them at once, as the guest', j.d);
  const p0 = await join(duel, 'ranked', 'ember');
  const M = p0.d.match;
  ok(p0.d.state === 'matched' && M.role === 'host' && M.side === 0 && M.id === j.d.match.id,
     'the first, queueing again before it collected the match, is given that match, as the host', p0.d);
  ok(M.queue === 'ranked' && M.rated === true && M.league.id === 'bronze' && M.bestOf === 3 && M.league.pilots === 'base' && M.league.awake === false,
     'a rated match, to BRONZE\'s rules: best of three, base pilots, nobody awake', M);
  ok(M.sides[0].name === 'Duelist' && M.sides[0].pilot === 'ember' && M.sides[0].awake === false && M.sides[0].ups.join() === 'u1,u2,u3'
     && M.sides[1].name === 'Rival' && M.sides[1].pilot === 'runner' && M.sides[1].ups.length === 0,
     'both sides as the server has them: the pilot, not awake here though the duelist\'s EMBER is, and each one\'s own reward upgrades', M.sides);
  ok(!ids.some(a => JSON.stringify(p0.d).includes(a)), 'never an account id');
  const held = envPvp.MATCH.instances.get(M.id).data.get('m');
  ok(held && held.sides.length === 2 && held.started > 0 && held.rated === true && held.league === 'bronze', 'the referee\'s match holds both sides from the start', held);
  ok((await poll(duel, 'ranked')).d.match.id === M.id, 'asked again, the same match');

  // the room's code passes through the match: nobody types it
  ok((await mt(rival, { op: 'code', id: M.id })).d.code === null, 'the guest asks for the room before there is one: not yet');
  ok((await mt(duel, { op: 'code', id: M.id, code: 'k7' })).status === 400, 'a code is a room code');
  ok((await mt(duel, { op: 'code', id: M.id, code: 'K7XQ' })).d.code === 'K7XQ', 'the host leaves its room\'s code');
  ok((await mt(rival, { op: 'code', id: M.id })).d.code === 'K7XQ', 'and the guest finds it there');
  ok((await mt(rival, { op: 'code', id: M.id, code: 'ZZZZ' })).status === 403, 'only the host has a room');
  ok((await mt(stranger, { op: 'code', id: M.id })).status === 403, 'nor can a stranger read it');

  // played out: the ratings move, once
  const fin = await playOut(duel, rival, M.id, won0);
  ok(fin.d.verdict && fin.d.verdict.v === 'played', 'played to the end, both agreeing', fin.d);
  const rd = rating('duelist'), rr = rating('rival');
  ok(rd && rr && rd.rating > 1500 && rr.rating < 1500 && rd.games === 1 && rd.wins === 1 && rr.losses === 1 && rd.rd < 350,
     'the winner\'s rating rises and the loser\'s falls, each surer of itself', [rd, rr]);
  ok(rd.league === null && row(M.id).applied === 1, 'still being placed: no league yet; the match marked as rated', [rd.league, row(M.id).applied]);
  await envPvp.MATCHMAKER.get(envPvp.MATCHMAKER.idFromName('ranked')).fetch('https://do/rate', { method: 'POST', body: JSON.stringify({ id: M.id }) });
  ok(rating('duelist').games === 1 && rating('duelist').rating === rd.rating, 'rated twice, it counts once');
  const me1 = await duel.me();
  ok(me1.d.league.provisional === true && me1.d.league.left === 4 && me1.d.league.rating === Math.round(rd.rating) && me1.d.league.wins === 1,
     '/api/pvp/me: the rating, and four placement matches left', me1.d.league);

  // placed: the league, and the length that comes with it
  setRating('duelist', 1550, 5);
  const me2 = await duel.me();
  ok(me2.d.league.id === 'gold' && me2.d.league.provisional === false && me2.d.league.bestOf === 5 && me2.d.loadouts.ranked.pilots.join() === 'runner,ember',
     'five matches in at 1550: GOLD, best of five, still the base pilots', me2.d.league);
  // GOLD meets a player still being placed: not at once, then to the lower league's rules
  await join(duel, 'ranked', 'runner'); await join(rival, 'ranked', 'ember');
  const [gh, gg, took] = await wait(duel, rival, 'ranked', 120);
  ok(gh && gg && gh.id === gg.id && took >= 40, 'two leagues and some rating apart: paired once both have waited a while', [took, gh]);
  ok(gh && gh.league.id === 'bronze' && gh.bestOf === 3 && gg.bestOf === 3, 'and played to the lower league\'s rules: best of three, not GOLD\'s five', gh && gh.league);

  // everything-goes meets the base pilots: never, however long they wait
  setRating('ace', 1900, 10);
  const aj = await join(ace, 'ranked', 'hacker');
  ok(aj.d.state === 'waiting', 'PLATINUM flies its own pilots in ranked, awake', aj.d);
  await join(stranger, 'ranked', 'runner');
  const [nh, , , da, db] = await wait(ace, stranger, 'ranked', 300);
  ok(!nh && da.state === 'waiting' && db.state === 'waiting', 'PLATINUM and a player on the base pilots are never paired, five minutes in', [da, db]);
  ok((await qq(ace, { op: 'leave', queue: 'ranked' })).d.state === 'left' && (await poll(ace, 'ranked')).d.state === 'none', 'leaving the queue drops the ticket');
  later(MM.STALE + 1000); await envPvp.MATCHMAKER.alarms();
  ok((await poll(stranger, 'ranked')).d.state === 'none', 'a ticket nobody polls for ' + MM.STALE / 1000 + ' s is gone');

  // one account searching from two tabs (or two devices): the second takes the ticket, the first is told
  const ta = 'a1'.repeat(8), tb = 'b2'.repeat(8);
  ok((await qq(bolt, { op: 'join', queue: 'casual', pilot: 'runner', tab: 'not a tab' })).status === 400, 'a tab mark is a tab mark');
  await qq(bolt, { op: 'join', queue: 'casual', pilot: 'runner', tab: ta });
  ok((await qq(bolt, { op: 'join', queue: 'casual', pilot: 'ember', tab: tb })).d.state === 'waiting', 'the same account joins again from another tab');
  ok((await qq(bolt, { op: 'poll', queue: 'casual', tab: ta })).d.state === 'elsewhere',
     'the first tab is told its account searches elsewhere now, rather than searching on for nobody');
  ok((await qq(bolt, { op: 'leave', queue: 'casual', tab: ta })).d.state === 'elsewhere'
     && (await qq(bolt, { op: 'poll', queue: 'casual', tab: tb })).d.state === 'waiting', 'and its leaving does not take the other tab\'s ticket');
  ok((await qq(bolt, { op: 'leave', queue: 'casual', tab: tb })).d.state === 'left', 'which leaves when it says so');

  // casual: unrated, each flies what they own
  await join(ace, 'casual', 'melee'); await join(bolt, 'casual', 'runner');
  const [C, Cg, ct] = await wait(ace, bolt, 'casual', 60);
  ok(C && Cg && C.id === Cg.id && C.rated === false && C.league.id === 'casual' && C.bestOf === 3 && ct > 0 && ct <= 20,
     'casual pairs a rating 400 apart within seconds: unrated, best of three', [ct, C]);
  ok(C && C.sides[0].pilot === 'melee' && C.sides[0].awake === true && C.sides[0].ups.join() === 'u9', 'flying what the account owns, awake where it is', C && C.sides[0]);
  const cf = await playOut(ace, bolt, C.id, won0);
  ok(cf.d.verdict.v === 'played' && row(C.id).rated === 0 && !DB.sql.prepare("SELECT 1 FROM pvp_ratings WHERE queue = 'casual'").get(),
     'played and recorded, and no rating moves', row(C.id));

  // ranked, no contest: nobody's rating moves
  await join(stranger, 'ranked', 'runner'); await join(bolt, 'ranked', 'ember');
  const [vh] = await wait(stranger, bolt, 'ranked', 8);
  later(5000);
  await mt(stranger, { op: 'report', id: vh.id, report: { fps: [[0, 60, 1]] } });
  const vv = await mt(bolt, { op: 'report', id: vh.id, report: { fps: [[0, 60, 2]] } });
  ok(vv.d.verdict.v === 'void' && !rating('stranger') && !rating('bolt'), 'the games disagree: no contest, and no rating moves', vv.d);
  // a quit moves both; the rating fails once (the queue's object out of reach), and is asked again at the next look
  later(31000);
  await join(stranger, 'ranked', 'runner'); await join(bolt, 'ranked', 'ember');
  const [fh] = await wait(stranger, bolt, 'ranked', 8);
  later(5000);
  await mt(stranger, { op: 'report', id: fh.id, report: { fps: [[0, 60, 1]] } });
  const mmReal = envPvp.MATCHMAKER;
  envPvp.MATCHMAKER = { idFromName: n => n, get: () => ({ fetch: async () => new Response('{}', { status: 500 }) }) };
  const cerr = console.error; console.error = () => {};
  const fq = await mt(bolt, { op: 'report', id: fh.id, report: { left: true } });
  envPvp.MATCHMAKER = mmReal; console.error = cerr;
  ok(fq.d.verdict.v === 'forfeit' && row(fh.id).applied === 0 && !rating('stranger'), 'a quit is a forfeit, but its ratings could not be written yet', [fq.d, row(fh.id).applied]);
  later(16000); await envPvp.MATCH.alarms();
  ok(row(fh.id).applied === 1 && rating('stranger').wins === 1 && rating('bolt').losses === 1, 'the next look writes them: a quit moves both', [rating('stranger'), rating('bolt')]);

  // the pairing's own costs, on an object of its own: a continent apart waits for the window to cover it
  const mmT = envPvp.MATCHMAKER.get(envPvp.MATCHMAKER.idFromName('region-test'));
  const tk = region => ({ name: 'x', pilot: 'runner', awake: false, ups: [], rating: 1500, league: 'bronze', bracket: 'base', region });
  const mmq = (op, who, ticket) => mmT.fetch('https://do/' + op, { method: 'POST', body: JSON.stringify({ queue: 'ranked', acct: who, ticket }) }).then(r => r.json());
  await mmq('join', 'r1', tk('EU'));
  ok((await mmq('join', 'r2', tk('NA'))).state === 'waiting', 'a continent apart: not at once');
  let at = 0;
  for (; at < 60; at += 2) { later(2000); await mmq('poll', 'r1'); if ((await mmq('poll', 'r2')).state === 'matched') break; }
  const expect = (MM.REGION - MM.WINDOW.ranked[0]) / MM.WINDOW.ranked[1];
  ok(at + 2 >= expect && at <= expect + 4, 'but paired once the window has grown to cover it (' + expect + ' s)', at + 2);
  Date.now = real;
}

section('PvP signs in and out on its own');
{
  const p = tab(PVP, '192.0.2.77');
  const r = await p.op('login', { name: 'duelist', pass: 'a fine password' });
  ok(r.status === 200, 'signing in at PvP directly', r.status);
  const lo = await p.op('logout');
  ok(lo.status === 200 && (await p.me()).status === 401, 'and out again', lo.status);
  ok((await home.call('GET', '/api/account')).d.account.name === 'duelist', 'which leaves the game signed in');
}

console.log(`\n${passes} passed, ${fails} failed  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
