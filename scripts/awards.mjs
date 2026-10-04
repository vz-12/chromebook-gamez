/* ===========================================================================
   THE AWARDS TEST — `npm run test:awards`.

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), the
   way scripts/account.mjs runs it. Plays what an account changes about the
   awards: a podium, a handout or WELCOME BACK held by any profile of an
   account reaching every device signed in to it, the account's own perks,
   the vigil paying a quest once per account, an old dev login claimed as an
   account by its password, and sessions only peeked at by these routes.

   No packages and no network. A few seconds, most of it scrypt.
   ========================================================================= */
import { makeD1 } from './lib/d1-sqlite.mjs';
import { scryptSync, randomBytes } from 'node:crypto';

process.env.VIGIL_ANYTIME = '1';         // the vigil open whatever today is

const worker = (await import('../src/index.js')).default;
const { DEV_ACCOUNTS, COMEBACK_KEY } = await import('../src/leaderboard.js');
const { getStore } = await import('../src/store.js');
const { STORE, ARCHIVE } = await import('../src/season.js');

const DB = makeD1();
const env = { DB, ASSETS: { fetch: () => new Response('asset') } };
const store = getStore(env, STORE);

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const one = q => DB.sql.prepare(q).get();

/* A browser: its own cookie, address and profile id. */
function device(ip, pid) {
  const d = { cookie: '', ip, pid };
  d.req = async (method, path, body) => {
    const headers = { 'cf-connecting-ip': ip, origin: 'https://voidrunner.online' };
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request('https://voidrunner.online' + path,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const sc = res.headers.get('set-cookie') || '';
    const m = /^vr_s=([^;]*)/.exec(sc);
    if (m) d.cookie = m[1];
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, d: data, cookie: sc };
  };
  d.op = (op, body = {}) => d.req('POST', '/api/account', Object.assign({ op, pid: d.pid }, body));
  // the game's own requests (Awards.sync, Vigil.load, Vigil.turnIn)
  d.awards = (name, pid = d.pid) => d.req('GET', '/api/leaderboard?awards=' + pid + (name ? '&name=' + name : ''));
  d.vigil = (pid = d.pid) => d.req('GET', '/api/leaderboard?vigil=hallows-2026&pid=' + pid);
  d.turnIn = quest => d.req('POST', '/api/leaderboard', { vigil: 'hallows-2026', quest, pid: d.pid });
  return d;
}
const pid = c => c.repeat(32);
const podiums = r => ((r.d && r.d.awards) || []).filter(a => a.season).map(a => a.season + '#' + a.rank).sort();
const skins = r => ((r.d && r.d.awards) || []).filter(a => a.skin).map(a => a.skin);
const perks = r => ((r.d && r.d.awards) || []).filter(a => a.perk).map(a => a.perk);
// what a reply must never carry: a profile id (WELCOME BACK's own `adopt` aside)
const leaks = r => { const { adopt, ...rest } = r.d || {}; return /[0-9a-f]{32}/.test(JSON.stringify(rest)); };
const PASS = 'a fine password';

const t0 = Date.now();

/* Two finished seasons. A's first place, a stranger's second place, C's
   third place a month later. */
const A = pid('a'), C = pid('c'), D = pid('d'), S = pid('5');
await store.setJSON(ARCHIVE, { list: {
  '2026-07': { closedAt: 1, top3: [{ rank: 1, name: 'ACE', score: 9, wave: 9, pid: A },
                                   { rank: 2, name: 'STRANGER', score: 8, wave: 8, pid: S },
                                   { rank: 3, name: 'NOBODY', score: 7, wave: 7, pid: null }] },
  '2026-08': { closedAt: 2, top3: [{ rank: 3, name: 'CEE', score: 5, wave: 5, pid: C }] } } });

const one1 = device('203.0.113.1', A);     // the account's first device
const two = device('203.0.113.2', C);      // and its second
const guest = device('203.0.113.3', D);    // somebody with no account

section('a guest is one profile, as before');
{
  const r = await two.awards();
  ok(r.status === 200 && podiums(r).join() === '2026-08#3', 'only its own podium', podiums(r));
  ok(!leaks(r), 'no pid in the reply', r.d);
  const g = await guest.awards();
  ok(g.status === 200 && podiums(g).length === 0 && skins(g).length === 0 && perks(g).length === 0,
     'a profile with nothing gets nothing', g.d);
}

section('signed in, every profile of the account');
{
  const r = await one1.op('register', { name: 'Ace_Pilot', pass: PASS });
  ok(r.status === 201, 'signed up on the first device', r.status);
  const l = await two.op('login', { name: 'ace_pilot', pass: PASS });
  ok(l.status === 200, 'signed in on the second', l.status);
  const id = one("SELECT id FROM accounts WHERE name = 'ace_pilot'").id;
  ok(one(`SELECT COUNT(*) AS n FROM account_pids WHERE account = '${id}'`).n === 2, 'both profiles linked');

  const r2 = await two.awards();
  ok(podiums(r2).join() === '2026-07#1,2026-08#3', 'the second device gets the first one\'s podium too', podiums(r2));
  ok(!podiums(r2).includes('2026-07#2'), 'and not the stranger\'s');
  ok(!leaks(r2), 'no pid in the reply', r2.d);
  const r1 = await one1.awards();
  ok(podiums(r1).join() === '2026-07#1,2026-08#3', 'and the first gets the second\'s', podiums(r1));

  // somebody who knows pid A but holds no session asks: A's own, as always
  const g = await guest.awards(null, A);
  ok(podiums(g).join() === '2026-07#1', 'a bare pid is still only itself', podiums(g));
  const g2 = await guest.awards();
  ok(podiums(g2).length === 0, 'the guest is untouched', podiums(g2));
}

section('a profile already on another account stays there');
{
  const other = device('203.0.113.4', S);
  const r = await other.op('register', { name: 'stranger', pass: PASS });
  ok(r.status === 201, 'the stranger has an account', r.status);
  // the account's owner signs in on the stranger's machine: first come keeps the pid
  const visit = device('203.0.113.5', S);
  const l = await visit.op('login', { name: 'ace_pilot', pass: PASS });
  ok(l.status === 200, 'signed in on the stranger\'s machine', l.status);
  ok(one(`SELECT a.name FROM account_pids p JOIN accounts a ON a.id = p.account WHERE p.pid = '${S}'`).name === 'stranger',
     'the pid stays with the stranger\'s account');
  const mine = await two.awards();
  ok(!podiums(mine).includes('2026-07#2'), 'so it never joins the account\'s awards', podiums(mine));
  const st = await other.awards();
  ok(podiums(st).join() === '2026-07#2', 'and the stranger keeps only theirs', podiums(st));
}

section('signed out, one profile again');
{
  const out = device('203.0.113.2', C);
  const r = await out.awards();
  ok(podiums(r).join() === '2026-08#3', 'no cookie: the second device\'s own podium', podiums(r));
  const bad = device('203.0.113.2', C);
  bad.cookie = 'not-a-session';
  const b = await bad.awards();
  ok(b.status === 200 && podiums(b).join() === '2026-08#3', 'a dead cookie is a guest', podiums(b));
}

section('the account\'s own perks');
{
  const set = v => DB.sql.prepare("UPDATE accounts SET perks = ? WHERE name = 'ace_pilot'").run(v);
  set('["skin:hl-carved","evo-ember"]');
  let r = await two.awards();
  ok(skins(r).includes('hl-carved') && perks(r).includes('evo-ember'), 'a skin and a perk, on every device', r.d);
  ok(skins(r).length === 1 && perks(r).length === 1, 'and nothing else', r.d);
  const g = await guest.awards();
  ok(skins(g).length === 0 && perks(g).length === 0, 'never to a guest', g.d);

  set('["dev"]');
  r = await one1.awards();
  for (const k of ['unlock-all', 'unlock-evo', 'unlock-event'])
    ok(perks(r).includes(k), 'dev: perk ' + k);
  for (const k of ['laurel', 'void-sovereign', 'rush-king', 'hl-lostsoul'])
    ok(skins(r).includes(k), 'dev: skin ' + k);
  ok(new Set(skins(r)).size === skins(r).length, 'each skin once', skins(r));

  for (const junk of ['[1, null, "", {"x": 1}]', 'not json', '{}']) {
    set(junk);
    r = await two.awards();
    ok(r.status === 200 && skins(r).length === 0 && perks(r).length === 0, 'junk perks are nothing: ' + junk, r.d);
  }
  set('[]');
}

section('handouts by pid reach the account');
{
  // DEV_PIDS: Mario's pid, signed up from; then a second device of his
  const MARIO = 'ecd8c7a3671b4582f6b62ee1106510c8', E = pid('e');
  const m1 = device('198.51.100.20', MARIO);
  ok((await m1.op('register', { name: 'mario_real', pass: PASS })).status === 201, 'Mario signs up on his pid');
  const m2 = device('198.51.100.21', E);
  ok((await m2.op('login', { name: 'mario_real', pass: PASS })).status === 200, 'and in on another machine');
  const r = await m2.awards();
  ok(perks(r).includes('unlock-all') && skins(r).includes('rush-king'), 'DEV_PIDS reach the other machine', r.d);
  ok(skins(r).includes('draft'), 'and SKIN_GRANTS', skins(r));
  const g = await device('198.51.100.22', E).awards();
  ok(perks(g).length === 0, 'that machine signed out has none of it', g.d);

  // EMBER's hand-made skin and perk
  const EMBER = '06a21d4e756af978bb640b8dff30d92e', F = pid('f');
  const e1 = device('198.51.100.30', EMBER);
  ok((await e1.op('register', { name: 'ember_real', pass: PASS })).status === 201, 'EMBER signs up on their pid');
  const e2 = device('198.51.100.31', F);
  ok((await e2.op('login', { name: 'ember_real', pass: PASS })).status === 200, 'and in elsewhere');
  const er = await e2.awards();
  ok(skins(er).includes('ember-gift') && perks(er).includes('evo-ember'), 'PERK_GRANTS and SKIN_GRANTS follow', er.d);
  ok(!perks(er).includes('unlock-all'), 'and nothing of Mario\'s', perks(er));

  // what an old dev login bound to a profile (the grants blob)
  const G = pid('6'), H = pid('7');
  await store.setJSON('grants', { byPid: { [G]: { user: 'notz', skins: ['laurel'], perks: ['unlock-all'], at: 1 },
                                           [H]: { user: 'gone', skins: ['standard'], perks: ['unlock-evo'], at: 1 } } });
  const g1 = device('198.51.100.40', G);
  ok((await g1.op('register', { name: 'old_dev', pass: PASS })).status === 201, 'a profile an old login was typed on');
  const g2 = device('198.51.100.41', pid('8'));
  ok((await g2.op('login', { name: 'old_dev', pass: PASS })).status === 200, 'its account on another machine');
  const gr = await g2.awards();
  ok(skins(gr).includes('laurel') && perks(gr).includes('unlock-all'), 'what the login banked follows', gr.d);
  ok(skins(gr).includes('hl-lostsoul') && perks(gr).includes('unlock-event'),
     'and, while notz is still listed, all it stands for', gr.d);
  const h = await device('198.51.100.42', H).awards();
  ok(skins(h).join() === 'standard' && perks(h).join() === 'unlock-evo',
     'a login no longer listed: only what it banked', h.d);
}

section('WELCOME BACK across an account');
{
  await store.setJSON('comeback-claims', { byName: { 'n:ace': A }, byPid: { [A]: { name: 'ace', adopt: null } }, old: {} });
  const r = await two.awards('NEWNAME');
  ok(perks(r).includes('comeback'), 'claimed on the first device, held on the second', r.d);
  ok(!r.d.adopt, 'no old pid handed to a device that did not claim it', r.d);
  const doc = await store.get('comeback-claims', { type: 'json' });
  ok(!Object.prototype.hasOwnProperty.call(doc.byPid, C) && Object.keys(doc.byName).length === 1,
     'and nothing claimed on its behalf', doc);
  const g = await guest.awards();
  ok(!perks(g).includes('comeback'), 'a guest gets none of it', g.d);
  const out = await device('203.0.113.2', C).awards();
  ok(!perks(out).includes('comeback'), 'nor the second device signed out', out.d);
  // the claim path itself is untouched: a known callsign, before sync.js has filed owners, claims nothing
  await store.setJSON(COMEBACK_KEY, { names: ['oldtimer'] });
  const q = await guest.awards('oldtimer');
  ok(q.status === 200 && !perks(q).includes('comeback'), 'no claim before the old pids are filed', q.d);
}

section('the vigil: a quest pays once per account');
{
  let r = await one1.turnIn('q1');
  ok(r.status === 200 && !r.d.already && r.d.total === 10 && r.d.lit === 10, 'the first device lights q1', r.d);
  r = await two.turnIn('q1');
  ok(r.status === 200 && r.d.already === true && r.d.total === 10, 'the second device: already, nothing paid', r.d);
  r = await two.vigil();
  ok(r.d.lit === 10 && r.d.done.join() === 'q1', 'and it reads the account\'s share', r.d);
  r = await two.turnIn('q2');
  ok(!r.d.already && r.d.total === 25 && r.d.lit === 25, 'a new quest from the second device pays', r.d);
  r = await one1.vigil();
  ok(r.d.lit === 25 && [...r.d.done].sort().join() === 'q1,q2', 'both quests, from either device', r.d);
  ok(!leaks(r), 'no pid in the reply', r.d);

  r = await guest.turnIn('q1');
  ok(!r.d.already && r.d.total === 35 && r.d.lit === 10, 'a guest still pays their own', r.d);
  r = await device('203.0.113.2', C).vigil();
  ok(r.d.lit === 15 && r.d.done.join() === 'q2', 'signed out, the second device is only itself', r.d);
  const v = await store.get('vigil:hallows-2026', { type: 'json' });
  ok(!(v.byPid[C].q || []).includes('q1'), 'q1 was never filed under the second pid', v.byPid[C]);
}

section('an old dev login becomes an account');
{
  const devPass = 'shrt12';               // the login's own: not judged again
  const salt = randomBytes(16);
  DEV_ACCOUNTS.testdev = { salt: salt.toString('hex'), perks: ['dev'],
    hash: scryptSync(devPass, salt, 32, { N: 16384, r: 8, p: 1 }).toString('hex') };
  const d = device('192.0.2.50', pid('9'));

  let r = await d.op('register', { name: 'testdev', pass: 'not the password' });
  ok(r.status === 409 && !r.cookie, 'a wrong password: taken, like any name', r);
  ok((one("SELECT n FROM auth_gate WHERE k = 'f:192.0.2.50:testdev'") || {}).n === 1, 'and it counts as a failed sign-in');
  ok(one("SELECT COUNT(*) AS n FROM accounts WHERE name = 'testdev'").n === 0, 'no account made');

  r = await d.op('register', { name: 'TestDev', pass: devPass });
  ok(r.status === 201 && /^[A-Z0-9]{4}(-[A-Z0-9]{4}){3}$/.test(r.d.recovery), 'the right password claims it, with a recovery code', r.d);
  ok(one("SELECT perks FROM accounts WHERE name = 'testdev'").perks === '["dev"]', 'born with the login\'s perks');
  ok(!one("SELECT k FROM auth_gate WHERE k = 'f:192.0.2.50:testdev'"), 'and the failed try is forgotten');
  const a = await d.awards();
  ok(perks(a).includes('unlock-all') && skins(a).includes('laurel'), 'everything, on the next sync', a.d);

  const again = device('192.0.2.51', pid('1'));
  r = await again.op('register', { name: 'testdev', pass: devPass });
  ok(r.status === 409, 'claimed once: the name is the account\'s now', r.status);
  r = await again.op('login', { name: 'testdev', pass: devPass });
  ok(r.status === 200, 'and it signs in like any account', r.status);

  r = await device('192.0.2.52', pid('2')).op('register', { name: 'NotZ', pass: 'a guess at it' });
  ok(r.status === 409 && one("SELECT COUNT(*) AS n FROM accounts WHERE name = 'notz'").n === 0,
     'notz: still nobody\'s without its password', r.status);

  const brute = device('192.0.2.53', pid('3'));
  for (let i = 0; i < 8; i++) await brute.op('register', { name: 'notz', pass: 'guess ' + i });
  r = await brute.op('register', { name: 'notz', pass: 'guess 9' });
  ok(r.status === 429, 'guessing it locks out like signing in', r.status);
}

section('the old dev login answers that it is gone');
{
  const r = await guest.req('POST', '/api/leaderboard', { pid: D, devAuth: { user: 'notz', pass: 'x' } });
  ok(r.status === 410 && /ACCOUNT/.test(r.d.error), 'devAuth: 410, pointing at accounts', r);
  const bl = await store.get('grants', { type: 'json' });
  ok(!Object.prototype.hasOwnProperty.call(bl.byPid, D), 'and binds nothing', bl);
}

section('these routes only peek at a session');
{
  const id = one("SELECT id FROM accounts WHERE name = 'ace_pilot'").id;
  const old = Date.now() - 3 * 24 * 60 * 60 * 1000;
  DB.sql.prepare('UPDATE sessions SET seen = ? WHERE account = ?').run(old, id);
  const seen = () => one(`SELECT MAX(seen) AS s FROM sessions WHERE account = '${id}'`).s;
  const r = await two.awards();
  ok(podiums(r).length === 2, 'the awards still know the account', podiums(r));
  ok(seen() === old, '?awards did not extend the session', seen());
  await two.vigil();
  ok(seen() === old, 'nor did the vigil', seen());
  await two.req('POST', '/api/boards', { op: 'me', pid: C });
  ok(seen() === old, 'nor /api/boards', seen());
  const run = await two.req('POST', '/api/leaderboard',
    { pid: C, name: 'CEE', score: 500, wave: 10, sector: 'S', loop: 0, level: 9, kills: 100, time: 300 });
  ok(run.status === 200, 'a run filed while signed in', run.status);
  ok(one(`SELECT COUNT(*) AS n FROM scores WHERE who = 'a:${id}'`).n > 0, 'under the account');
  ok(seen() === old, 'and filing it did not extend the session', seen());
  const acc = await two.req('GET', '/api/account');
  ok(seen() > old && /Max-Age=7776000/.test(acc.cookie), '/api/account extends it, and sends the cookie again', acc.cookie);
}

console.log(`\n${passes} passed, ${fails} failed  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
