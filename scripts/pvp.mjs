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
import { createHash, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { makeNamespace } from './lib/do-fake.mjs';

const main = (await import('../src/index.js')).default;
const pvp = (await import('../pvp/src/index.js')).default;
const { pruneAuth } = await import('../src/auth.js');
const { loadout, LEAGUES, CASUAL } = await import('../pvp/src/rules.js');
const { Match, Matchmaker, MM } = await import('../pvp/src/objects.js');
const { seasonOf } = await import('../src/season.js');
const { REF, cleanReport } = await import('../pvp/src/referee.js');
const { closeSeasons, seasonBefore, SOFT } = await import('../pvp/src/seasons.js');
const { PODIUM_REWARDS, BADGE_REWARDS } = await import('../src/pvp-rewards.js');
const { ratingOf, applyRating } = await import('../pvp/src/records.js');
const { START, rateMatch } = await import('../pvp/src/glicko.js');
const { PLACEMENTS } = await import('../pvp/src/rules.js');
const { LIMITS, forget } = await import('../pvp/src/limits.js');
const { entryFor } = await import('../pvp/src/gates.js');
const { QUEUES } = await import('../pvp/src/rules.js');

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
                     { result: { winner: 0, score: [2, 0], bestOf: 4 } }, { result: { winner: 0, score: [2, 0], bestOf: 1 } }])
    ok((await rep(duel, id, bad)).status === 400, 'a malformed report is refused: ' + JSON.stringify(bad).slice(0, 50));
  // one long round against a hidden pilot in ranked (rules.js, HIDDEN)
  ok((cleanReport({ result: { winner: 1, score: [0, 1], bestOf: 1 } }) || {}).result?.bestOf === 1, 'a one-round match\'s result is a result');
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
  /* Everyone here has played the game a while, so ranked's gates (a day,
     ten runs; tested on their own below) let them in: their accounts a
     couple of days old, and runs in their saves (a save with no unlocks is
     the same as none to the queue). */
  DB.sql.prepare('UPDATE accounts SET created = created - 2 * 86400000').run();
  for (const id of ids) {
    DB.sql.prepare("UPDATE saves SET data = json_set(data, '$.runs', 25) WHERE account = ?").run(id);
    DB.sql.prepare("INSERT OR IGNORE INTO saves (account, rev, data, unlocks, updated) VALUES (?, 1, '{\"runs\":25}', 'null', ?)").run(id, Date.now());
  }
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
  const told = fin.d.verdict.rating;
  ok(told && told.before === 1500 && told.after < 1500 && told.games === 1 && told.league === null && told.left === 4,
     'the verdict tells the side asking its own rating, before and after, for its result screen', told);
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

section('entry: who may join a queue');
{
  const now = Date.now(), H = 3600 * 1000;
  // a player made `age` ago, with `runs` in a save (or no save), signed in at PvP
  let n = 0;
  const player = (age, runs, perks = '[]', data) => {
    const id = randomBytes(16).toString('hex'), token = randomBytes(32).toString('base64url'), name = 'gate_' + (++n);
    DB.sql.prepare('INSERT INTO accounts (id, name, display, pass, recovery, pid, perks, created, updated) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)')
      .run(id, name, name, '-', '-', perks, now - age, now);
    if (runs !== null || data) DB.sql.prepare("INSERT INTO saves (account, rev, data, unlocks, updated) VALUES (?, 1, ?, 'null', ?)")
      .run(id, data || JSON.stringify({ runs }), now);
    DB.sql.prepare('INSERT INTO sessions (id, account, created, seen, expires, device) VALUES (?, ?, ?, ?, ?, NULL)').run(sha(token), id, now, now, now + 864e5);
    const t = tab(PVP, '198.51.100.' + (130 + n)); t.cookie = token;
    return t;
  };
  const join = (t, queue) => t.call('POST', '/api/pvp/queue', { op: 'join', queue, pilot: 'runner' });
  const leave = (t, queue) => t.call('POST', '/api/pvp/queue', { op: 'leave', queue });

  const fresh = player(0, null);
  const fm = (await fresh.me()).d;
  ok(fm.queues.ranked.open === false && fm.queues.ranked.why === 'RANKED opens when your account is 1 day old: in 24 hours',
     'a brand-new account: ranked is shut, and the lobby is told why', fm.queues.ranked);
  ok(fm.queues.casual.open === true && fm.queues.casual.why === null, 'casual is open to it');
  const fj = await join(fresh, 'ranked');
  ok(fj.status === 403 && fj.d.error === fm.queues.ranked.why && fj.d.gates.map(g => g.gate).join() === 'accountAge:24h,runs:10',
     'joining ranked anyway: refused, with every gate still shut', fj.d);
  const fc = await join(fresh, 'casual');
  ok(fc.status === 200 && fc.d.state === 'waiting', 'joining casual: in the queue', fc.d);
  await leave(fresh, 'casual');

  const young = player(20 * H, 30);
  ok((await young.me()).d.queues.ranked.why === 'RANKED opens when your account is 1 day old: in 4 hours', 'twenty hours old: four hours to go');
  const nosave = player(48 * H, null);
  ok((await nosave.me()).d.queues.ranked.why === 'RANKED opens after 10 runs of VOIDRUNNER: 10 to go', 'old enough, no save: ten runs to go');
  const seven = player(48 * H, 7);
  ok((await seven.me()).d.queues.ranked.why === 'RANKED opens after 10 runs of VOIDRUNNER: 3 to go', 'seven runs: three to go');
  const junk = player(48 * H, null, '[]', '{not json');
  ok((await junk.me()).d.queues.ranked.why === 'RANKED opens after 10 runs of VOIDRUNNER: 10 to go', 'a save that will not parse counts no runs');
  const ready = player(25 * H, 10);
  const rm = (await ready.me()).d;
  ok(rm.queues.ranked.open === true, 'a day old and ten runs: ranked is open', rm.queues.ranked);
  const rj = await join(ready, 'ranked');
  ok(rj.status === 200 && rj.d.state === 'waiting', 'and in the queue', rj.d);
  await leave(ready, 'ranked');
  const dev = player(0, null, '["dev"]');
  ok((await dev.me()).d.queues.ranked.open === true && (await join(dev, 'ranked')).status === 200, 'a dev account goes straight in, to test with');
  await leave(dev, 'ranked');

  // a gate nobody wrote is a shut door, said plainly, not an open one
  QUEUES.casual.entry.push('nope:1');
  const odd = await entryFor(DB, { id: 'x', created: 0, perks: [] }, 'casual');
  QUEUES.casual.entry.pop();
  ok(odd.open === false && /misconfigured/.test(odd.why), 'an unknown gate shuts the queue', odd);
  ok((await entryFor(DB, { id: 'x', created: 0, perks: [] }, 'nope')).open === false, 'and so does an unknown queue');
  const page = readFileSync(new URL('../pvp/site/index.html', import.meta.url), 'utf8'), js = readFileSync(new URL('../pvp/site/pvp.js', import.meta.url), 'utf8');
  ok(/id="rankedGate"/.test(page) && /id="casualGate"/.test(page) && /d\.queues/.test(js), 'the lobby shows a shut queue\'s reason and turns its button off');
}

section('the ad suggestion: groundwork, off until ads are set up (pvp/site/ads.js)');
{
  const vm = await import('node:vm');
  const code = readFileSync(new URL('../pvp/site/ads.js', import.meta.url), 'utf8');
  // the lobby's page, just enough of it: its tab's storage, and what it is asked to load
  const page = () => {
    const store = new Map(), made = [];
    const win = {
      sessionStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => { store.set(k, String(v)); }, removeItem: k => { store.delete(k); } },
      document: { createElement: tag => { const el = { tag, attrs: {}, setAttribute(k, v) { this.attrs[k] = v; } }; made.push(el); return el; },
                  head: { appendChild() {} } }
    };
    win.window = win;
    vm.createContext(win);
    vm.runInContext(code, win);
    return { win, made, store, A: win.PvpAds };
  };
  const lobbyUi = () => {
    const u = { shown: [], got: 0, closed: 0 };
    u.ui = { offer: r => u.shown.push(r), earned: () => { u.got++; }, skipped: () => { u.closed++; } };
    return u;
  };

  const off = page(), u0 = lobbyUi();
  ok(off.A.config.client === '' && off.A.start(u0.ui) === false && off.made.length === 0 && u0.shown.length === 0,
     'as shipped: no publisher id, so nothing is loaded and nothing offered');
  ok(off.A.take() === 0 && off.A.pending() === false, 'and no bonus to give');

  // set up, as it will be once the address is approved
  const on = page(), u = lobbyUi();
  on.A.config.client = 'ca-pub-0000000000000000';
  on.win.adsbygoogle = [];
  ok(on.A.start(u.ui) === true, 'with a publisher id it starts');
  const script = on.made.find(e => e.tag === 'script');
  ok(script && script.src === 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js' && script.attrs['data-ad-client'] === 'ca-pub-0000000000000000'
     && !('data-adbreak-test' in script.attrs), 'loading Google\'s ad script for that publisher, real ads unless asked for test ones', script);
  const cfg = on.win.adsbygoogle[0];
  ok(cfg && cfg.preloadAdBreaks === 'on' && typeof cfg.onReady === 'function', 'configured to have an ad ready ahead of time');
  ok(u.shown.length === 0, 'and nothing offered before an ad is ready');
  cfg.onReady();
  const brk = on.win.adsbygoogle[1];
  ok(brk && brk.type === 'reward' && brk.name === 'friend-bonus', 'once ready, it asks for a rewarded ad (the player chooses to watch it)', brk);
  let played = 0;
  brk.beforeReward(() => { played++; });
  ok(u.shown[u.shown.length - 1] === true && played === 0, 'an ad is ready: the offer shows, and nothing plays until the player asks');
  on.A.watch();
  ok(played === 1, 'WATCH plays it');
  brk.adViewed(); brk.adBreakDone({ breakStatus: 'viewed' });
  ok(u.got === 1 && on.A.pending() === true && u.shown[u.shown.length - 1] === false, 'watched to the end: the bonus is earned, and the offer goes');
  const n = on.win.adsbygoogle.length;
  on.A.ask();
  ok(on.win.adsbygoogle.length === n, 'with a bonus waiting, it asks for no more ads');
  ok(on.A.take() === 2 && on.A.take() === 0 && on.A.pending() === false, 'the next friend match takes the two upgrades, once');
  cfg.onReady();
  const brk2 = on.win.adsbygoogle[on.win.adsbygoogle.length - 1];
  brk2.beforeReward(() => {}); on.A.watch(); brk2.adDismissed(); brk2.adBreakDone({ breakStatus: 'dismissed' });
  ok(u.closed === 1 && on.A.pending() === false && on.A.take() === 0, 'closed early: no bonus, and nothing held against them');
  on.A.watch();
  ok(true, 'WATCH with no ad ready does nothing');
  const test = page();
  test.A.config.client = 'ca-pub-0000000000000000'; test.A.config.test = true; test.win.adsbygoogle = [];
  test.A.start(lobbyUi().ui);
  ok(test.made.find(e => e.tag === 'script').attrs['data-adbreak-test'] === 'on', 'test: true asks Google for test ads');

  // the lobby: only a friend's match takes the bonus; the queues never do
  const js = readFileSync(new URL('../pvp/site/pvp.js', import.meta.url), 'utf8'), html = readFileSync(new URL('../pvp/site/index.html', import.meta.url), 'utf8');
  ok((js.match(/bonus: bonus\(\)/g) || []).length === 2, 'HOST and JOIN hand the bonus to the friend match');
  const found = js.slice(js.indexOf('function found('), js.indexOf('function found(') + 1200);
  ok(found.includes("play({ mode: 'match'") && !/bonus/.test(found), 'a queued match is handed none');
  ok(/<script src="\/ads.js"><\/script>\s*<script src="\/pvp.js">/.test(html) && /id="adOffer" hidden/.test(html), 'the offer is in the page, hidden until an ad is ready');
}

section('seasons: the podium at the turn, and the soft reset');
{
  const acct = n => one(`SELECT id FROM accounts WHERE name = '${n}'`).id;
  const cfg = readFileSync(new URL('../pvp/wrangler.jsonc', import.meta.url), 'utf8');
  ok(/"triggers":\s*\{\s*"crons":\s*\["20 0 \* \* \*"\]\s*\}/.test(cfg) && typeof pvp.scheduled === 'function', 'the PvP Worker has its daily cron');
  ok(seasonBefore('2026-10') === '2026-09' && seasonBefore('2026-01') === '2025-12', 'the season before, across a year too');
  const now = Date.now(), cur = seasonOf(now), prev = seasonBefore(cur), older = seasonBefore(prev), oldest = seasonBefore(older);
  const mk = name => {
    const id = randomBytes(16).toString('hex');
    DB.sql.prepare('INSERT INTO accounts (id, name, display, pass, recovery, pid, perks, created, updated) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)')
      .run(id, name.toLowerCase(), name, '-', '-', '[]', now, now);
    return id;
  };
  const P = { ace: mk('S_Ace'), bea: mk('S_Bea'), cal: mk('S_Cal'), dee: mk('S_Dee'), eve: mk('S_Eve'), fay: mk('S_Fay') };
  const rate = (acct, season, rating, league, updated, rd = 60, games = 20, queue = 'ranked') =>
    DB.sql.prepare(`INSERT OR REPLACE INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
                    VALUES (?, ?, ?, ?, ?, 0.06, ?, 10, 10, ?, ?)`).run(acct, queue, season, rating, rd, games, league, updated);
  // last season: Eve rated highest but was never placed; Bea and Cal tied, and Cal got there first
  rate(P.eve, prev, 2400, null, 1, 300, 3);
  rate(P.ace, prev, 2210, 'void', 5);
  rate(P.bea, prev, 1990, 'platinum', 9);
  rate(P.cal, prev, 1990, 'platinum', 7);
  rate(P.dee, prev, 1700, 'gold', 3);
  rate(P.fay, prev, 3000, 'void', 1, 60, 20, 'casual');      // casual has no podium
  rate(P.dee, older, 1600, 'gold', 2);                        // the season before that: Dee alone
  rate(P.cal, cur, 1880, 'gold', 6);                          // and this season, already placed: not filed while it runs
  const filed = await closeSeasons(DB, now);
  const pod = s => DB.sql.prepare('SELECT rank, account, rating, league FROM pvp_podiums WHERE season = ? ORDER BY rank').all(s);
  ok(filed.join() === [older, prev].join(), 'every finished season with ratings filed, oldest first, and the running one not', filed);
  ok(pod(prev).map(r => r.account).join() === [P.ace, P.cal, P.bea].join() && pod(prev)[0].league === 'void' && pod(prev)[0].rating === 2210,
     'the top three placed, in the ladder\'s order: a tie goes to whoever got there first', pod(prev));
  ok(!pod(prev).some(r => r.account === P.eve || r.account === P.fay), 'never a player still being placed, nor casual, whatever the rating');
  ok(pod(older).length === 1 && pod(older)[0].account === P.dee, 'one placed player: a podium of one', pod(older));
  ok(pod(cur).length === 0, 'the season still running has none');
  ok((await closeSeasons(DB, now)).length === 0 && pod(prev).length === 3, 'run again: nothing more filed, nothing changed');
  // a season the cron missed is caught up by the next run
  rate(P.bea, oldest, 1800, 'gold', 4);
  const jobs = [];
  await pvp.scheduled({ cron: '20 0 * * *' }, envPvp, { waitUntil: p => jobs.push(p) });
  const quiet = console.log; console.log = () => {};
  await Promise.all(jobs);
  console.log = quiet;
  ok(pod(oldest).length === 1 && pod(oldest)[0].account === P.bea, 'the daily cron files a season missed before', pod(oldest));

  // league badges: every placed player, the league they finished in (QUEUES.ranked.rewards: leagueBadge)
  const badge = s2 => DB.sql.prepare('SELECT account, league, rating FROM pvp_badges WHERE season = ? ORDER BY rating DESC').all(s2);
  const lb = badge(prev);
  const want = [P.ace + ':void', P.bea + ':platinum', P.cal + ':platinum', P.dee + ':gold'];
  ok(lb.length === 4 && want.every(k => lb.some(r => r.account + ':' + r.league === k)),
     'every placed player of last season badged with the league they finished in', lb);
  ok(!lb.some(r => r.account === P.eve || r.account === P.fay), 'never one still being placed, nor casual');
  ok(badge(older).length === 1 && badge(older)[0].league === 'gold' && badge(oldest).length === 1 && badge(oldest)[0].account === P.bea,
     'and the seasons before, the cron\'s too', [badge(older), badge(oldest)]);
  ok(badge(cur).length === 0, 'none for the season still running');
  // a queue pays what its rewards name: a reward added later is caught up for seasons already closed
  const ancient = seasonBefore(oldest);
  rate(P.ace, ancient, 1650, 'gold', 1);
  const was = QUEUES.ranked.rewards.slice();
  QUEUES.ranked.rewards.splice(0, QUEUES.ranked.rewards.length, 'seasonPodium');
  ok((await closeSeasons(DB, now)).join() === ancient && pod(ancient).length === 1 && badge(ancient).length === 0,
     'a queue whose rewards name only the podium files only the podium', [pod(ancient), badge(ancient)]);
  QUEUES.ranked.rewards.splice(0, QUEUES.ranked.rewards.length, ...was);
  ok((await closeSeasons(DB, now)).join() === ancient && badge(ancient).length === 1 && pod(ancient).length === 1,
     'and once it names the badge too, the next run files the badges it missed, the podium not twice', [pod(ancient), badge(ancient)]);
  // a big season: every one of its placed players badged, in batches
  const big = seasonBefore(ancient);
  for (let i = 0; i < 120; i++) rate('bulk-' + i, big, 1500 + i, 'silver', i);
  await closeSeasons(DB, now);
  ok(badge(big).length === 120 && pod(big).length === 3 && pod(big)[0].account === 'bulk-119', 'a season of 120 placed players: 120 badges, one podium', [badge(big).length, pod(big).length]);
  QUEUES.casual.rewards.push('nope');
  let threw = null;
  try { await closeSeasons(DB, now); } catch (e) { threw = e; }
  QUEUES.casual.rewards.pop();
  ok(!threw, 'a reward nobody wrote is passed by', String(threw));

  // the game's awards: a PvP podium in its own shape, never the game's own crowns, and what it is worth
  const me = acct('duelist');
  DB.sql.prepare("INSERT INTO pvp_podiums (season, queue, rank, account, rating, league, filed) VALUES ('2025-11', 'ranked', 1, ?, 2301.4, 'void', ?)").run(me, now);
  DB.sql.prepare("INSERT INTO pvp_badges (season, queue, account, league, rating, filed) VALUES ('2025-11', 'ranked', ?, 'void', 2301.4, ?)").run(me, now);
  DB.sql.prepare("INSERT INTO pvp_badges (season, queue, account, league, rating, filed) VALUES ('2025-10', 'ranked', ?, 'gold', 1611, ?)").run(me, now);
  const aw = async () => (await home.call('GET', '/api/leaderboard?awards=' + 'a'.repeat(32))).d.awards || [];
  let got = await aw();
  const medal = got.find(x => x.pvp);
  ok(medal && medal.pvp.season === '2025-11' && medal.pvp.rank === 1 && medal.pvp.rating === 2301 && medal.pvp.league === 'void'
     && medal.via === 'PVP 2025-11 #1', 'signed in, the game\'s awards carry the account\'s PvP podium', medal);
  ok(got.filter(x => x.pvp).every(x => !('season' in x) && !('rank' in x)),
     'in a shape the game does not read as one of its own season podiums (no top-level season or rank)');
  ok(!got.some(x => x.skin || x.perk && /^PVP/.test(x.via || '')), 'and nothing granted for it while the rewards are undecided');
  PODIUM_REWARDS[1].skins.push('test-crown'); PODIUM_REWARDS[1].perks.push('test-perk');
  got = await aw();
  PODIUM_REWARDS[1].skins.pop(); PODIUM_REWARDS[1].perks.pop();
  ok(got.some(x => x.skin === 'test-crown' && x.via === 'PVP 2025-11 #1') && got.some(x => x.perk === 'test-perk' && x.via === 'PVP 2025-11 #1'),
     'once a place is worth something, it is granted with it', got.filter(x => /^PVP/.test(x.via || '')));
  const guest = (await tab(GAME, '198.51.100.120').call('GET', '/api/leaderboard?awards=' + 'a'.repeat(32))).d.awards || [];
  ok(!guest.some(x => x.pvp), 'asked as a guest (a pid, no account): no PvP podium');
  got = await aw();
  const badges = got.filter(x => x.pvpBadge);
  ok(badges.length === 2 && badges[0].pvpBadge.season === '2025-11' && badges[0].pvpBadge.league === 'void' && badges[0].via === 'PVP 2025-11 VOID'
     && badges[1].pvpBadge.league === 'gold', 'the account\'s league badges, newest first', badges);
  ok(badges.every(x => !('season' in x) && !('rank' in x)), 'in their own shape too, never read as the game\'s podiums');
  BADGE_REWARDS.gold.perks.push('test-gold');
  got = await aw();
  BADGE_REWARDS.gold.perks.pop();
  ok(got.some(x => x.perk === 'test-gold' && x.via === 'PVP 2025-10 GOLD') && !got.some(x => x.perk === 'test-gold' && x.via === 'PVP 2025-11 VOID'),
     'what a league is worth goes with its badge, and only that league\'s', got.filter(x => /^PVP/.test(x.via || '')));
  const prof = (await tab(GAME).call('GET', '/api/boards?user=duelist')).d;
  ok(prof && prof.pvp && prof.pvp.podiums.length === 1 && prof.pvp.podiums[0].season === '2025-11' && prof.pvp.podiums[0].rank === 1,
     'and the profile shows it', prof && prof.pvp && prof.pvp.podiums);
  ok(prof.pvp.badges.length === 2 && prof.pvp.badges[0].league === 'void' && prof.pvp.badges[1].season === '2025-10', 'and the badges', prof.pvp.badges);
  const ace = (await tab(GAME).call('GET', '/api/boards?user=s_ace')).d;
  ok(ace.pvp.podiums.length === 2 && ace.pvp.podiums[0].season === prev && ace.pvp.podiums[0].league === 'void' && ace.pvp.podiums[1].season === ancient, 'everyone\'s, as filed', ace.pvp.podiums);
  ok(!JSON.stringify(prof).includes(me), 'with no account ids');

  // the soft reset: last season's rating, halfway back to 1500, a little less sure, placements again
  const ca = await ratingOf(DB, P.ace, 'ranked', cur), ce = await ratingOf(DB, P.eve, 'ranked', cur);
  ok(ca && ca.carried && ca.rating === 1500 + 710 * SOFT.pull && ca.rd === SOFT.rd && ca.games === 0 && ca.league === null,
     'a player with no rating yet this season starts from last season\'s, pulled halfway back', ca);
  ok(ce.rating === 1500 + 900 * SOFT.pull && ce.rd === 300, 'an uncertain one keeps its larger deviation', ce);
  ok(await ratingOf(DB, mk('S_Gus'), 'ranked', cur) === null, 'a newcomer: nothing to carry, the newcomer\'s 1500');
  ok((await ratingOf(DB, acct('duelist'), 'ranked', cur)).carried === undefined, 'a player already rated this season keeps that rating');
  const tokenAce = randomBytes(32).toString('base64url');
  DB.sql.prepare('INSERT INTO sessions (id, account, created, seen, expires, device) VALUES (?, ?, ?, ?, ?, NULL)').run(sha(tokenAce), P.ace, now, now, now + 864e5);
  const aceTab = tab(PVP, '198.51.100.121'); aceTab.cookie = tokenAce;
  const meAce = (await aceTab.me()).d;
  ok(meAce.league.provisional === true && meAce.league.left === PLACEMENTS, 'their league waits on the placement matches again', meAce.league);
  const mid = randomBytes(16).toString('hex');
  DB.sql.prepare(`INSERT INTO pvp_matches (id, queue, league, rated, a, b, a_pilot, b_pilot, winner, score_a, score_b, best_of, verdict, reason, started, ended, season)
                  VALUES (?, 'ranked', 'bronze', 1, ?, ?, 'runner', 'ember', 0, 2, 1, 3, 'played', NULL, ?, ?, ?)`).run(mid, P.ace, P.bea, now, now, cur);
  const cb = await ratingOf(DB, P.bea, 'ranked', cur);
  const [na, nb] = rateMatch(ca, cb, true);
  const applied = await applyRating(DB, mid);
  const nowAce = DB.sql.prepare("SELECT * FROM pvp_ratings WHERE account = ? AND queue = 'ranked' AND season = ?").get(P.ace, cur);
  const nowBea = DB.sql.prepare("SELECT * FROM pvp_ratings WHERE account = ? AND queue = 'ranked' AND season = ?").get(P.bea, cur);
  ok(applied.moved && Math.abs(nowAce.rating - na.rating) < 1e-9 && Math.abs(nowBea.rating - nb.rating) < 1e-9 && nowAce.games === 1 && nowAce.league === null,
     'their first match of the season rates from the carried rating, not from 1500', [nowAce.rating, na.rating, nowBea.rating, nb.rating]);
  ok(nowAce.rating > rateMatch(START, START, true)[0].rating, 'so a strong player stays ahead of a newcomer who won the same match');
}

section('a hidden pilot\'s challenge: armed by hand, tripped by the first in VOID, sent to the top of ranked');
{
  const { armSql, dateSql, cancelSql, inVaultSql, challengesSql, checkDate, checkPilot } = await import('./lib/challenge-sql.mjs');
  const { putSql } = await import('./lib/vault-sql.mjs');
  const { tripChallenges, targetOf, TOP_LEAGUE } = await import('../pvp/src/challenge.js');
  // what `npm run challenge` and `npm run vault` would send, run statement by statement as they do
  const tool = sql => {
    let rows = [];
    for (const s of sql.split(/;\s*\n/).map(x => x.replace(/;\s*$/, '').trim()).filter(Boolean)) {
      const st = DB.sql.prepare(s);
      rows = /^SELECT/i.test(s) ? st.all() : (st.run(), []);
    }
    return rows;
  };
  const now = Date.now(), cur = seasonOf(now);
  const row = p => DB.sql.prepare('SELECT * FROM pvp_challenges WHERE pilot = ?').get(p) || null;
  // players of a few days, with runs, each signed in at PvP and in the game
  let n = 0;
  const mk = (name, perks = []) => {
    const id = randomBytes(16).toString('hex'), token = randomBytes(32).toString('base64url'), ip = '198.51.100.' + (130 + n++);
    DB.sql.prepare('INSERT INTO accounts (id, name, display, pass, recovery, pid, perks, created, updated) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)')
      .run(id, name.toLowerCase(), name, '-', '-', JSON.stringify(perks), now - 3 * 864e5, now);
    DB.sql.prepare("INSERT INTO saves (account, rev, data, unlocks, updated) VALUES (?, 1, '{\"runs\":25}', 'null', ?)").run(id, now);
    DB.sql.prepare('INSERT INTO sessions (id, account, created, seen, expires, device) VALUES (?, ?, ?, ?, ?, NULL)').run(sha(token), id, now, now, now + 864e5);
    const p = tab(PVP, ip), g = tab(GAME, ip);
    p.cookie = g.cookie = token;
    return { id, pvp: p, game: g };
  };
  const rate = (who, rating, league, updated) => DB.sql.prepare(
    `INSERT OR REPLACE INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
     VALUES (?, 'ranked', ?, ?, 100, 0.06, 20, 10, 10, ?, ?)`).run(who.id, cur, rating, league, updated);
  // the dev flies both test pilots, from the top of the ladder
  const H = mk('C_Holder', ['vault:x9', 'vault:x8']), T = mk('C_Top'), U = mk('C_Climb'), L = mk('C_Low');
  rate(H, 2600, 'void', now - 5000);
  rate(T, 2098, 'platinum', now - 4000);
  rate(U, 2050, 'platinum', now - 3000);
  rate(L, 1600, 'gold', now - 2000);
  const words = { t: 'TEST WORDS', x: 'Line one.\n\nLine two.' };
  tool(putSql('x9', Buffer.from('/* a stand-in */')).sql);
  tool(putSql('x9-words', Buffer.from(JSON.stringify(words))).sql);

  ok(TOP_LEAGUE === 'void', 'the league that trips it is the highest: VOID');
  ok((await tripChallenges(DB)).length === 0 && !row('x9'), 'nothing armed: nothing goes out, though the holder sits in VOID');
  let threw = 0;
  for (const p of ['runner', 'Not An Id', '']) { try { checkPilot(p); } catch (e) { threw++; } }
  ok(threw === 3, 'the tool arms only a hidden pilot\'s vault id: never one of the game\'s own pilots');
  ok(tool(inVaultSql(['x9', 'x9-words', 'nope'])).map(r => r.id).sort().join() === 'x9,x9-words', 'and finds what the vault holds before it arms anything');
  tool(armSql('x9', 'x9-words', now));
  ok(row('x9') && row('x9').armed === now && row('x9').tripped === null && row('x9').target === null, 'armed by hand', row('x9'));
  ok((await tripChallenges(DB)).length === 0 && row('x9').tripped === null, 'the pilot\'s own holder in VOID trips nothing');
  ok(!('challenge' in (await T.pvp.me()).d), 'nobody has it yet');

  // rated matches, through the queue's Matchmaker as the referee sends them
  const rateVia = async (a, b, winner) => {
    const id = randomBytes(16).toString('hex');
    DB.sql.prepare(`INSERT INTO pvp_matches (id, queue, league, rated, a, b, a_pilot, b_pilot, winner, score_a, score_b, best_of, verdict, reason, started, ended, season)
                    VALUES (?, 'ranked', 'platinum', 1, ?, ?, 'runner', 'ember', ?, 3, 1, 5, 'played', NULL, ?, ?, ?)`).run(id, a.id, b.id, winner, Date.now(), Date.now(), cur);
    const mm = envPvp.MATCHMAKER;
    return (await mm.get(mm.idFromName('ranked')).fetch('https://do/rate', { method: 'POST', body: JSON.stringify({ id }) })).json();
  };
  const r1 = await rateVia(U, L, 0);
  ok(r1.moved && !r1.ratings.some(x => x.league === TOP_LEAGUE) && row('x9').tripped === null, 'a rated match that places nobody in VOID: still armed', r1.ratings);
  const r2 = await rateVia(T, U, 0);
  ok(r2.moved && r2.ratings[0].league === TOP_LEAGUE && r2.ratings[1].league !== TOP_LEAGUE, 'then one that does: the winner past 2100, into VOID', r2.ratings);
  const c = row('x9');
  ok(c.tripped > 0 && c.reached_by === T.id && c.season === cur, 'and the Matchmaker trips it there and then: when, by whom, in which season', c);
  ok(c.target === T.id, 'sent to the top of ranked, passing over the holder above: the pilot does not challenge its own', c.target);
  ok((await tripChallenges(DB)).length === 0 && row('x9').target === T.id && row('x9').tripped === c.tripped, 'tripped again: nothing more goes out');

  // the lobby: the words, for the one it was sent to and nobody else
  const mt = (await T.pvp.me()).d;
  ok(mt.challenge && mt.challenge.t === words.t && mt.challenge.x === words.x && mt.challenge.due === null, 'their lobby has it: the words, and no date yet', mt.challenge);
  ok(Object.keys(mt.challenge).sort().join() === 'due,t,x' && !JSON.stringify(mt).includes(T.id), 'and nothing else of it: not the pilot, not an account');
  const seen = row('x9').seen;
  ok(seen > 0, 'its first showing noted');
  await T.pvp.me();
  ok(row('x9').seen === seen, 'once');
  for (const [who, said] of [[U, 'the #2'], [H, 'the holder'], [L, 'anybody else']])
    ok(!('challenge' in (await who.pvp.me()).d), 'never in ' + said + '\'s lobby');
  const page = readFileSync(new URL('../pvp/site/index.html', import.meta.url), 'utf8'), js = readFileSync(new URL('../pvp/site/pvp.js', import.meta.url), 'utf8');
  ok(/id="challenge" hidden/.test(page) && /renderChallenge\(d\.challenge/.test(js), 'the lobby has a place for it, hidden until there is one');
  // the game's account reply: only that one waits, for the menu's PVP door
  const ga = (await T.game.call('GET', '/api/account')).d;
  ok(ga.challenge === true && ga.account.name === 'c_top' && Object.keys(ga).every(k => ['account', 'turnstile', 'challenge'].includes(k)),
     'the game\'s account reply says one waits, and no more', ga);
  ok(!('challenge' in (await U.game.call('GET', '/api/account')).d) && !('challenge' in (await tab(GAME, '198.51.100.150').call('GET', '/api/account')).d),
     'and nothing for anybody else, signed in or not');

  // the date: the tool's to set, in ISO with its zone
  threw = 0;
  for (const s of ['tomorrow', '2026-11-14T18:00', '2026-13-01T00:00Z']) { try { checkDate(s); } catch (e) { threw++; } }
  ok(threw === 3 && checkDate('none') === null && checkDate('2026-11-14T13:00-05:00') === Date.UTC(2026, 10, 14, 18), 'a date is ISO with its zone, or none');
  tool(dateSql('x9', checkDate('2026-11-14T18:00Z')));
  ok((await T.pvp.me()).d.challenge.due === Date.UTC(2026, 10, 14, 18), 'set after it has gone out, the lobby has it');

  // ranked: the pilot waits for the one it was sent to, though somebody else is #1 by now
  rate(U, 2400, 'void', Date.now() + 1000);
  const q = (who, b) => who.pvp.call('POST', '/api/pvp/queue', Object.assign({ queue: 'ranked' }, b));
  ok((await q(H, { op: 'join', pilot: 'x9' })).d.state === 'waiting', 'its holder queues it in ranked');
  ok((await q(U, { op: 'join', pilot: 'runner' })).d.state === 'waiting', 'the new #2 among the rest queues');
  ok((await q(H, { op: 'poll' })).d.state === 'waiting' && (await q(U, { op: 'poll' })).d.state === 'waiting', 'and is not who it waits for');
  const tj = await q(T, { op: 'join', pilot: 'runner' });
  const hp = await q(H, { op: 'poll' }), tp = tj.d.state === 'matched' ? tj : await q(T, { op: 'poll' });
  ok(hp.d.state === 'matched' && tp.d.state === 'matched' && hp.d.match.id === tp.d.match.id && tp.d.match.league.id === 'hidden',
     'the one it was sent to queues: the two of them, in one match, to its own rules', [hp.d, tp.d]);
  ok((await q(U, { op: 'poll' })).d.state === 'waiting', 'and the other waits on');
  await q(U, { op: 'leave' });
  tool(cancelSql('x9'));
  ok(!row('x9') && (await targetOf(DB, 'x9')) === null && !('challenge' in (await T.pvp.me()).d), 'cancelled: gone, from the lobby too');

  // armed after somebody is already in VOID: the daily cron sends it
  tool(putSql('x8', Buffer.from('/* another */')).sql);
  tool(putSql('x8-words', Buffer.from(JSON.stringify({ x: 'Other words.' }))).sql);
  tool(armSql('x8', 'x8-words'));
  ok(row('x8').tripped === null, 'armed while two are already in VOID: nothing until somebody looks');
  const jobs = [], quiet = console.log;
  console.log = () => {};
  await pvp.scheduled({ cron: '20 0 * * *' }, envPvp, { waitUntil: p => jobs.push(p) });
  await Promise.all(jobs);
  console.log = quiet;
  const c8 = row('x8');
  ok(c8.tripped > 0 && c8.reached_by === T.id && c8.target === U.id,
     'the daily cron sends it: tripped by the first one there, sent to whoever is on top now', c8);
  const m8 = (await U.pvp.me()).d.challenge;
  ok(m8 && m8.t === '' && m8.x === 'Other words.', 'their lobby has it; a title left out is the lobby\'s to fill', m8);
  tool(armSql('x8', 'x9-words'));
  ok(row('x8').words === 'x9-words' && row('x8').target === U.id && row('x8').tripped === c8.tripped, 'armed again once sent: only its words change');
  const ls = tool(challengesSql());
  ok(ls.length === 1 && ls[0].pilot === 'x8' && ls[0].reached_by === 'c_top' && ls[0].target === 'c_climb' && ls[0].seen !== '-' && ls[0].due === '-',
     'the tool lists it, by name, never an id', ls);
  DB.sql.prepare("UPDATE pvp_challenges SET words = 'gone' WHERE pilot = 'x8'").run();
  ok(!('challenge' in (await U.pvp.me()).d), 'words the vault no longer holds: no challenge in the lobby, never half of one');
  tool(cancelSql('x8'));
}

section('live spectating: a challenge\'s match on air, its relay, /api/live and the replay');
{
  const { Broadcast, KEEP, VIEW } = await import('../pvp/src/broadcast.js');
  const { armSql, dateSql, cancelSql, announceSql, columnsSql, addedSql, challengesSql } = await import('./lib/challenge-sql.mjs');
  const { putSql } = await import('./lib/vault-sql.mjs');
  const { tripChallenges, ensureChallenges, liveNow, LIVE, CHALLENGE_ADDED } = await import('../pvp/src/challenge.js');
  const { forgetLive } = await import('../src/live.js');
  const cfg = readFileSync(new URL('../pvp/wrangler.jsonc', import.meta.url), 'utf8');
  ok(/"name":\s*"BROADCAST",\s*"class_name":\s*"Broadcast"/.test(cfg) && /"tag":\s*"v2",\s*"new_sqlite_classes":\s*\["Broadcast"\]/.test(cfg),
     'the Worker binds the Broadcast object as BROADCAST, SQLite-backed, in a migration of its own (v2)');
  envPvp.BROADCAST = makeNamespace(Broadcast, envPvp);
  const tool = sql => {
    let rows = [];
    for (const s of sql.split(/;\s*\n/).map(x => x.replace(/;\s*$/, '').trim()).filter(Boolean)) {
      const st = DB.sql.prepare(s);
      rows = /^(SELECT|PRAGMA)/i.test(s) ? st.all() : (st.run(), []);
    }
    return rows;
  };
  const now = Date.now(), cur = seasonOf(now);
  let n = 0;
  const mk = (name, perks = []) => {
    const id = randomBytes(16).toString('hex'), token = randomBytes(32).toString('base64url'), ip = '198.51.100.' + (170 + n++);
    DB.sql.prepare('INSERT INTO accounts (id, name, display, pass, recovery, pid, perks, created, updated) VALUES (?, ?, ?, ?, ?, NULL, ?, ?, ?)')
      .run(id, name.toLowerCase(), name, '-', '-', JSON.stringify(perks), now - 3 * 864e5, now);
    DB.sql.prepare("INSERT INTO saves (account, rev, data, unlocks, updated) VALUES (?, 1, '{\"runs\":25}', 'null', ?)").run(id, now);
    DB.sql.prepare('INSERT INTO sessions (id, account, created, seen, expires, device) VALUES (?, ?, ?, ?, ?, NULL)').run(sha(token), id, now, now, now + 864e5);
    const p = tab(PVP, ip);
    p.cookie = token;
    return { id, pvp: p };
  };
  const H = mk('L_Holder', ['vault:x7']), T = mk('L_Top'), S = mk('L_Stranger'), D = mk('L_Dev', ['dev']);
  DB.sql.prepare(`INSERT OR REPLACE INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
                  VALUES (?, 'ranked', ?, 3000, 60, 0.06, 30, 25, 5, 'void', ?)`).run(T.id, cur, now - 60000);
  const pilotCode = '/* the hidden pilot, as the vault keeps it */';
  tool(putSql('x7', Buffer.from(pilotCode)).sql);
  tool(putSql('x7-words', Buffer.from(JSON.stringify({ t: 'A CHALLENGE', x: 'Come and find out.' }))).sql);
  tool(putSql('x7-air', Buffer.from(JSON.stringify({ t: 'ON AIR', x: 'The first to VOID meets it.', as: 'THE GUEST' }))).sql);
  const row = () => DB.sql.prepare("SELECT * FROM pvp_challenges WHERE pilot = 'x7'").get() || null;
  const gameLive = async () => {
    forgetLive();
    const res = await main.fetch(new Request(GAME + '/api/live', { headers: { 'cf-connecting-ip': '203.0.113.9' } }), envMain);
    return { status: res.status, cache: res.headers.get('cache-control'), d: await res.json() };
  };
  const anon = tab(PVP, '203.0.113.60');

  // before anything is sent: nothing on, and nothing to ask about for a quarter of an hour
  let g = await gameLive();
  ok(g.status === 200 && g.d.live === null && g.d.every === LIVE.IDLE && /public, max-age=30/.test(g.cache),
     '/api/live, open to anyone: nothing on air, ask again in fifteen minutes; cached thirty seconds', g);
  tool(armSql('x7', 'x7-words'));
  await tripChallenges(DB);
  ok(row().target === T.id, 'a challenge armed and sent, to the top of ranked', row());
  g = await gameLive();
  ok(g.d.live === null && g.d.every === LIVE.ASK, 'sent, with no date yet: the game asks every minute', g.d);
  tool(dateSql('x7', now + 3 * 864e5));
  ok((await liveNow(DB, now)).every === LIVE.IDLE, 'its date days away: every fifteen minutes');
  ok((await liveNow(DB, now + 3 * 864e5 - 40 * 60e3)).every === 600, 'forty minutes before it: until half an hour before it');
  ok((await liveNow(DB, now + 3 * 864e5 - 10 * 60e3)).every === LIVE.ASK, 'within half an hour of it: every minute');
  ok((await liveNow(DB, now + 3 * 864e5 + 7 * 3600e3)).every === LIVE.IDLE, 'and long past it, never fought: back to fifteen');
  tool(dateSql('x7', null));

  // the queue makes the challenge's match: on air from then
  const q = (who, b) => who.pvp.call('POST', '/api/pvp/queue', Object.assign({ queue: 'ranked' }, b));
  ok((await q(H, { op: 'join', pilot: 'x7' })).d.state === 'waiting', 'its holder queues it');
  const tj = await q(T, { op: 'join', pilot: 'runner' });
  const hp = await q(H, { op: 'poll' }), tp = tj.d.state === 'matched' ? tj : await q(T, { op: 'poll' });
  const mid = hp.d.match && hp.d.match.id;
  ok(mid && tp.d.match && tp.d.match.id === mid && hp.d.match.side === 0, 'the one it went to queues: their match, the pilot\'s side hosting', [hp.d, tp.d]);
  ok(row().match === mid && row().started > 0 && row().ended === null, 'and the challenge notes it: which match, since when', row());
  g = await gameLive();
  ok(g.d.live && g.d.live.match === mid && g.d.live.t === '' && g.d.live.x === '' && g.d.live.names.join() === '???,L_Top' && g.d.every === LIVE.ASK,
     'on air, though nothing announced yet: the match, both sides (the pilot\'s unnamed), a plain title', g.d);
  ok(tool(announceSql('x7', 'x7-air')) && row().announce === 'x7-air', 'announced by hand (npm run challenge -- announce)');
  g = await gameLive();
  ok(g.d.live.t === 'ON AIR' && g.d.live.x === 'The first to VOID meets it.' && g.d.live.names.join() === 'THE GUEST,L_Top' && g.d.live.since === row().started,
     'now with its words, and the pilot named as the words name it', g.d.live);
  ok(!JSON.stringify(g.d).includes(T.id) && !JSON.stringify(g.d).includes(H.id) && !JSON.stringify(g.d).includes('x7'),
     'and nothing more: no account, not the pilot\'s id');
  // PvP's lobby asks its own Worker the same (pvp.js, live): one answer, from either address
  forgetLive();
  const pl = await anon.call('GET', '/api/live');
  ok(pl.status === 200 && JSON.stringify(pl.d) === JSON.stringify(g.d), 'PvP\'s Worker gives its lobby the same answer', pl.d);
  const lobby = readFileSync(new URL('../pvp/site/index.html', import.meta.url), 'utf8'), lobbyJs = readFileSync(new URL('../pvp/site/pvp.js', import.meta.url), 'utf8');
  ok(/<section class="card live" id="live" hidden>/.test(lobby) && lobby.indexOf('id="live"') < lobby.indexOf('id="loading"')
     && /call\('GET', '\/api\/live'\)/.test(lobbyJs) && /'\/play\/\?watch=' \+ on\.match/.test(lobbyJs),
     'the lobby has a LIVE card at the top, for everybody, that watches the match');
  tool(putSql('x7-air', Buffer.from(JSON.stringify({ t: 'ON AIR', x: 'Unnamed.', as: 'THE GUEST', named: false }))).sql);
  ok((await liveNow(DB)).live.names.join() === 'THE GUEST,', 'words saying named: false keep the other player\'s name off it');
  ok(tool(columnsSql()).map(r => r.name).join().includes('announce') && addedSql(tool(columnsSql()).map(r => r.name)) === '',
     'the tool finds every column there');

  // the pilot's code: nobody watching yet, so nobody is handed it
  const code = (who, qs) => who.call('GET', '/api/pvp/pilot?' + qs);
  ok((await code(anon, 'id=x7&watch=' + mid)).status === 404, 'before the match is on air, naming it hands nobody the pilot');

  // the feed: only the side flying the hidden pilot
  const head = { v: 1, match: { queue: 'ranked', bestOf: 1, sides: [{ name: 'L_Holder', pilot: 'x7' }, { name: 'L_Top', pilot: 'runner' }] }, run: { seed: 7 },
                 hellos: [{ name: 'L_Holder' }, { name: 'L_Top' }] };
  const feed = (who, b) => who.call('POST', '/api/pvp/watch', Object.assign({ match: mid }, b));
  ok((await feed(anon, { op: 'head', head, build: 'b1.x' })).status === 401, 'signed out: refused');
  ok((await feed(S.pvp, { op: 'head', head, build: 'b1.x' })).status === 403, 'not in the match: refused');
  ok((await feed(T.pvp, { op: 'head', head, build: 'b1.x' })).status === 403, 'the other side, flying one of the game\'s pilots: refused');
  ok((await feed(H.pvp, { op: 'head', head, build: 'not a build!' })).status === 400, 'a malformed build: refused');
  const h1 = await feed(H.pvp, { op: 'head', head, build: 'b1.x' });
  ok(h1.status === 200 && h1.d.next === 0, 'the side flying the hidden pilot, its own to fly: on air', h1);
  ok((await feed(H.pvp, { op: 'head', head, build: 'b1.x' })).d.next === 0, 'the same header again is no change');
  const got = await code(anon, 'id=x7&watch=' + mid);
  ok(got.status === 200 && got.d === pilotCode, 'from now on its code goes to anybody watching, signed in or not', got.status);
  ok((await code(anon, 'id=x8&watch=' + mid)).status === 404 && (await code(anon, 'id=x7&watch=' + 'f'.repeat(32))).status === 404,
     'but only that pilot, and only for a broadcast it flies in');

  // batches: in order, nothing skipped, each taken once
  const recs = steps => Buffer.alloc(steps * 22, 7).toString('base64');
  const fpsOf = (from, steps) => { const o = []; for (let s = Math.ceil(from / 60) * 60; s < from + steps; s += 60) if (s) o.push([0, s, (s * 2654435761) >>> 0]); return o; };
  const put = (from, steps, who = H) => feed(who.pvp, { op: 'in', from, n: steps, recs: recs(steps), fps: fpsOf(from, steps) });
  ok((await put(0, 30, T)).status === 403, 'the other side cannot add to it');
  let r = await put(0, 30);
  ok(r.status === 200 && r.d.next === 30, 'a batch: thirty steps', r);
  ok((await put(0, 30)).d.next === 30, 'sent twice, taken once');
  r = await put(60, 30);
  ok(r.status === 409 && r.d.need === 30, 'one that skips steps is refused, with where to start', r);
  ok((await feed(H.pvp, { op: 'in', from: 30, n: 30, recs: 'not base64!', fps: [] })).status === 400
     && (await feed(H.pvp, { op: 'in', from: 30, n: 30, recs: recs(30), fps: [[0, 999, 1]] })).status === 400
     && (await feed(H.pvp, { op: 'in', from: 30, n: 30, recs: recs(30 * 10), fps: [] })).status === 400, 'malformed records or fingerprints: refused');
  for (let s = 30; s < 2400; s += 30) await put(s, 30);
  ok((await feed(H.pvp, { op: 'snap', at: 9999, epoch: 0, json: '{}' })).status === 400, 'a snapshot of a step not yet sent: refused');
  const big = JSON.stringify({ fight: 'x'.repeat(KEEP.PART * 2 + 500) });
  ok((await feed(H.pvp, { op: 'snap', at: 900, epoch: 0, json: '{"early":1}' })).status === 200
     && (await feed(H.pvp, { op: 'snap', at: 2100, epoch: 0, json: big })).status === 200, 'snapshots, one bigger than a stored piece');
  ok((await feed(H.pvp, { op: 'snap', at: 1500, epoch: 0, json: '{}' })).status === 409, 'and never one older than the last');

  // viewers: anyone, no account
  const look = async (qs, ip = '203.0.113.61') => {
    const res = await pvp.fetch(new Request(PVP + '/api/pvp/watch?match=' + mid + qs, { headers: { 'cf-connecting-ip': ip } }), envPvp);
    return { status: res.status, d: await res.json() };
  };
  let v = await look('&v=' + '1'.repeat(16));
  ok(v.status === 200 && JSON.stringify(v.d.head) === JSON.stringify(head) && v.d.snap && v.d.snap.at === 2100 && v.d.snap.json === big,
     'a newcomer: the header and the latest snapshot, whole again', [v.status, v.d.snap && v.d.snap.at]);
  ok(v.d.from === 2100 && v.d.batches[0].from <= 2100 && v.d.batches[0].from + v.d.batches[0].n > 2100
     && v.d.batches[v.d.batches.length - 1].from + v.d.batches[v.d.batches.length - 1].n - 1 === 2399 && v.d.last === 2399 && v.d.end === null,
     'and the steps from there to the latest', [v.d.from, v.d.batches.length, v.d.last]);
  ok(v.d.every === VIEW.BASE_MS, 'asked to come back in a second', v.d.every);
  v = await look('&from=2300');
  ok(!v.d.head && !v.d.snap && v.d.batches[0].from === 2280 && v.d.batches.length === 4 && v.d.batches.every(b => b.fps.every(f => f[1] >= b.from && f[1] < b.from + b.n)),
     'one keeping up: only the steps since, with their fingerprints', v.d.batches.map(b => b.from));
  v = await look('&from=200');
  ok(v.d.snap && v.d.snap.at === 2100 && v.d.from === 2100, 'one far behind the latest snapshot is given it', v.d.from);
  v = await look('&from=1000');
  ok(!v.d.snap && v.d.from === 1000 && v.d.batches.reduce((a, b) => a + b.n, 0) <= VIEW.MOST + 30, 'one a little behind plays on, a stretch at a time', v.d.batches.length);
  v = await look('&from=2350&snap=1');
  ok(v.d.snap && v.d.snap.at === 2100, 'and one whose game parted from the fight asks for the snapshot', v.d.from);
  ok((await look('&from=nonsense')).d.head, 'a nonsense step is a newcomer');
  ok((await look('')).status === 200 && (await pvp.fetch(new Request(PVP + '/api/pvp/watch?match=nope'), envPvp)).status === 400, 'a malformed match: refused');
  const none = await pvp.fetch(new Request(PVP + '/api/pvp/watch?match=' + 'e'.repeat(32)), envPvp);
  ok(none.status === 404, 'a match not on air: nothing to watch', none.status);

  // a crowd: each viewer told to wait longer, so all of them together ask about PER times a second
  for (let i = 0; i < VIEW.PER + 5; i++) await look('&from=2390&v=' + i.toString(16).padStart(16, 'a'));
  v = await look('&from=2390');
  ok(v.d.every === VIEW.BASE_MS * 2, VIEW.PER + 6 + ' viewers: every two seconds', v.d.every);
  // all from memory: a hundred polls read nothing from storage
  const reads = envPvp.BROADCAST.reads;
  for (let i = 0; i < 100; i++) await look('&from=' + (2000 + i));
  ok(envPvp.BROADCAST.reads === reads, 'a hundred polls, no storage read', envPvp.BROADCAST.reads - reads);
  // and gone out of memory, it reads its log back, the same
  const before = await look('&from=-1');
  envPvp.BROADCAST.evict(mid);
  const after = await look('&from=-1');
  delete before.d.every; delete after.d.every;
  ok(JSON.stringify(before.d) === JSON.stringify(after.d) && envPvp.BROADCAST.reads > reads, 'woken again, it reads its log back and answers the same');

  // the end, and the referee: off air
  ok((await feed(H.pvp, { op: 'end', at: 2400, result: { winner: 0, score: [1, 0] } })).status === 200, 'the end');
  v = await look('&from=2390');
  ok(v.d.end && v.d.end.at === 2400 && v.d.end.result.winner === 0 && v.d.end.result.score.join() === '1,0' && v.d.end.left === null, 'the viewers are told', v.d.end);
  ok((await H.pvp.call('POST', '/api/pvp/match', { op: 'report', id: mid, report: { left: true } })).status === 200, 'the holder leaves the match');
  ok(row().ended > 0, 'the referee decides it, and the challenge notes it', row());
  g = await gameLive();
  ok(g.d.live === null, 'off air', g.d);
  ok((await code(anon, 'id=x7&watch=' + mid)).status === 200, 'its broadcast stays, and with it the pilot for whoever watches it back');

  // the replay: the whole log, to dev accounts and the pilot's holders
  const keep = async who => {
    const res = await pvp.fetch(new Request(PVP + '/api/pvp/watch?match=' + mid + '&replay=1',
      { headers: who ? { cookie: 'vr_s=' + who.pvp.cookie } : {} }), envPvp);
    return { status: res.status, file: res.headers.get('content-disposition') || '', d: await res.json().catch(() => null) };
  };
  ok((await keep(null)).status === 401 && (await keep(T)).status === 403 && (await keep(S)).status === 403, 'nobody else: not signed out, not its opponent, not a stranger');
  const rh = await keep(H), rd = await keep(D);
  ok(rh.status === 200 && /attachment; filename="voidrunner-[0-9a-f]{8}\.replay\.json"/.test(rh.file), 'its holder downloads it, as a file', rh.file);
  ok(rh.d.batches.length === 80 && rh.d.batches[79].from === 2370 && rh.d.snaps.length === 2 && rh.d.snaps[1].json === big
     && rh.d.end.at === 2400 && rh.d.build === 'b1.x' && rh.d.pilot === 'x7' && JSON.stringify(rh.d.head) === JSON.stringify(head),
     'the whole of it: header, every batch and snapshot, the end, the build it plays on', [rh.d.batches.length, rh.d.snaps.length]);
  ok(rd.status === 200 && rd.d.batches.length === 80, 'and so does a dev account');
  ok(rh.d.pilots && rh.d.pilots.x7 === pilotCode && Object.keys(rh.d.pilots).join() === 'x7',
     'with the hidden pilot\'s code in it, so the file plays with no account and no Worker (the replay page)', Object.keys(rh.d.pilots || {}));
  // the lobby's REPLAYS card: what the same accounts may keep, and only they
  const list = async who => { const r = await (who ? who.pvp : anon).call('GET', '/api/pvp/watch?list=1'); return r; };
  const lh = await list(H), ld = await list(D);
  ok(lh.status === 200 && lh.d.broadcasts.length === 1 && lh.d.broadcasts[0].match === mid && lh.d.broadcasts[0].names.join() === 'L_Holder,L_Top'
     && lh.d.broadcasts[0].at > 0 && !JSON.stringify(lh.d).includes(H.id), 'the holder\'s list: the broadcast, when, and who fought', lh.d);
  ok(ld.status === 200 && ld.d.broadcasts.some(b => b.match === mid), 'a dev account\'s too');
  ok((await list(null)).status === 401 && (await list(T)).status === 403 && (await list(S)).status === 403, 'nobody else\'s: not signed out, not its opponent, not a stranger');
  ok((await H.pvp.me()).d.replays === true && (await D.pvp.me()).d.replays === true && !('replays' in (await T.pvp.me()).d),
     'the lobby is told who may keep replays, and the field is missing for everybody else');
  const O = mk('L_Other', ['vault:x9']), lo = await list(O);
  ok(lo.status === 200 && lo.d.broadcasts.length === 0 && (await O.pvp.call('GET', '/api/pvp/watch?match=' + mid + '&replay=1')).status === 403,
     'another hidden pilot\'s holder has a list of their own, without this one in it, and may not keep it', [lo.status, lo.d]);
  await feed(H.pvp, { op: 'head', head, build: 'b1.x' });
  ok(DB.sql.prepare('SELECT COUNT(*) AS n FROM pvp_broadcasts WHERE match = ?').get(mid).n === 1 && (await list(H)).d.broadcasts[0].at === lh.d.broadcasts[0].at,
     'a broadcast is noted once, when it first went on air, however often its header comes');
  const lobbyHtml = readFileSync(new URL('../pvp/site/index.html', import.meta.url), 'utf8'), lobbyScript = readFileSync(new URL('../pvp/site/pvp.js', import.meta.url), 'utf8');
  ok(/<div class="card replays" id="replays" hidden>/.test(lobbyHtml) && /replays\(!!d\.replays\)/.test(lobbyScript)
     && /'\/api\/pvp\/watch\?match=' \+ b\.match \+ '&replay=1'/.test(lobbyScript), 'the lobby lists them for whoever may keep them, each a download');

  // a log has a size it stops at
  const was = KEEP.MAX;
  KEEP.MAX = 0;
  ok((await put(2400, 30)).status === 413, 'full: refused');
  KEEP.MAX = was;

  // made again (the last never got going): the new match takes its place
  const { challengeBegun } = await import('../pvp/src/challenge.js');
  await challengeBegun(DB, 'x7', T.id, 'a'.repeat(32));
  ok(row().match === 'a'.repeat(32) && row().ended === null, 'a challenge\'s match made again is the one on air');
  ok(tool(challengesSql()).find(x => x.pilot === 'x7').announce === 'x7-air', 'and the tool lists it with its announcement and match');

  // a table made before the columns: PvP's Worker adds them, and the tool can too
  const { makeD1 } = await import('./lib/d1-sqlite.mjs');
  const old = makeD1();
  old.sql.exec('CREATE TABLE pvp_challenges (pilot TEXT PRIMARY KEY, words TEXT NOT NULL, armed INTEGER NOT NULL, due INTEGER, tripped INTEGER, reached_by TEXT, season TEXT, target TEXT, seen INTEGER)');
  const have = () => old.sql.prepare('PRAGMA table_info(pvp_challenges)').all().map(c => c.name);
  ok(addedSql(have()).split('\n').length === CHALLENGE_ADDED.length, 'an old table lacks the new columns: the tool would add every one');
  await ensureChallenges(old);
  ok(CHALLENGE_ADDED.every(([c]) => have().includes(c)), 'PvP\'s Worker adds them on its own first use');
  tool(cancelSql('x7'));
}

section('hardening: per-account limits on the busy routes');
{
  forget();
  const real = Date.now;
  let clock = real();
  Date.now = () => clock;
  const q = t => t.call('POST', '/api/pvp/queue', { op: 'poll', queue: 'casual' });
  let first = null;
  for (let i = 0; i < LIMITS.queue.n; i++) { const r = await q(duel); if (r.status === 429) { first = i; break; } }
  ok(first === null, 'a queue poll a second and more, the whole minute: never turned away', first);
  const over = await q(duel);
  ok(over.status === 429 && over.d.wait > 0 && over.d.wait <= 60, 'past the limit: 429, and how long to wait', over);
  const rival = tab(PVP, '198.51.100.90');
  await rival.op('login', { name: 'rival', pass: 'a fine password' });
  ok((await q(rival)).status !== 429, 'another account is not held up by it');
  clock += 61000;
  ok((await q(duel)).status !== 429, 'and a minute on, the first is let back');
  for (let i = 0; i < LIMITS.match.n; i++) await duel.call('POST', '/api/pvp/match', { op: 'report', id: 'nope' });
  const m = await duel.call('POST', '/api/pvp/match', { op: 'report', id: 'nope' });
  ok(m.status === 429, 'the referee\'s route too, past its own limit', m.status);
  clock += 61000;
  forget();
  let opened = 0;
  for (let i = 0; i < LIMITS.open.n + 1; i++) {
    const r = await duel.call('POST', '/api/pvp/match', { op: 'open', kind: 'friend', pilot: 'runner' });
    if (r.status === 200) opened++;
    else { ok(r.status === 429 && i === LIMITS.open.n, 'friend\'s matches opened: the thirty-first in ten minutes is refused', [i, r.status]); break; }
  }
  ok(opened === LIMITS.open.n, 'thirty opened before that', opened);
  Date.now = real;
  forget();
}

section('hardening: the flags, for review');
{
  const acct = n => one(`SELECT id FROM accounts WHERE name = '${n}'`).id;
  const now = Date.now();
  ok((await tab(PVP).call('GET', '/api/pvp/flags')).status === 401, 'signed out: 401');
  ok((await duel.call('GET', '/api/pvp/flags')).status === 403, 'a player\'s account: 403');
  // a cheater: one account flagged against three different opponents
  const ids = ['s_eve', 's_ace', 's_bea', 's_cal'].map(n => acct(n));
  for (const other of ids.slice(1)) {
    const id = randomBytes(16).toString('hex');
    DB.sql.prepare(`INSERT INTO pvp_matches (id, queue, league, rated, a, b, a_pilot, b_pilot, winner, score_a, score_b, best_of, verdict, reason, started, ended, season)
                    VALUES (?, 'ranked', 'gold', 1, ?, ?, 'runner', 'ember', NULL, NULL, NULL, 3, 'void', 'fingerprints', ?, ?, ?)`).run(id, ids[0], other, now, now, seasonOf(now));
    for (const a of [ids[0], other])
      DB.sql.prepare("INSERT INTO pvp_flags (account, match, reason, at) VALUES (?, ?, 'fingerprints', ?)").run(a, id, now);
  }
  DB.sql.prepare("UPDATE accounts SET perks = '[\"dev\"]' WHERE name = 'stranger'").run();
  const stranger = tab(PVP, '198.51.100.91');
  await stranger.op('login', { name: 'stranger', pass: 'a fine password' });
  const r = await stranger.call('GET', '/api/pvp/flags');
  ok(r.status === 200 && Array.isArray(r.d.accounts) && Array.isArray(r.d.recent), 'a dev account: the list', r.status);
  const a = r.d.accounts;
  ok(a[0].name === 's_eve' && a[0].opponents === 3 && a[0].flags === 3 && a[0].reasons.fingerprints === 3,
     'the account flagged against the most different opponents comes first', a[0]);
  const ace = a.find(x => x.name === 's_ace');
  ok(ace && ace.opponents === 1, 'each of its opponents was flagged against just the one', ace);
  const du = a.find(x => x.name === 'duelist');
  ok(du && du.reasons.fingerprints >= 1 && du.reasons.parted >= 1 && du.reasons.results >= 1 && du.reasons.dropped >= 1 && du.played >= du.flags,
     'the referee\'s no-contests from earlier, by reason, beside the matches played', du);
  ok(r.d.recent.length >= 3 && r.d.recent.every(x => x.players.length === 2 && x.reason), 'and the latest no-contests, by name', r.d.recent.slice(0, 2));
  ok(!/[0-9a-f]{32}/.test(JSON.stringify(r.d)), 'with no account or match ids');
  DB.sql.prepare("UPDATE accounts SET perks = '[]' WHERE name = 'stranger'").run();
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
