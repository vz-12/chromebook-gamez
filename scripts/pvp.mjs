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

const main = (await import('../src/index.js')).default;
const pvp = (await import('../pvp/src/index.js')).default;
const { pruneAuth } = await import('../src/auth.js');
const { loadout, LEAGUES, CASUAL } = await import('../pvp/src/rules.js');

const DB = makeD1();
const asset = new Response('asset');
const envMain = { DB, ASSETS: { fetch: () => asset.clone() } };
const envPvp = { DB, SIGNUP: 'off', ASSETS: { fetch: () => new Response('pvp page') } };

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
  for (const path of ['/api/pvp/queue', '/api/pvp/match']) {
    const q = await p.call('GET', path);
    ok(q.status === 501, path + ': not yet', q.status);
  }
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
  ok(t.status === 409, 'signed in there as somebody else: refused', t);
  ok((await other.call('GET', '/api/account')).d.account.name === 'someone_else', 'and they stay who they were');

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
