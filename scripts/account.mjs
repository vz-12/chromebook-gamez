/* ===========================================================================
   THE ACCOUNTS TEST — `npm run test:account`.

   Runs the real Worker (src/index.js) against a real SQLite database
   (scripts/lib/d1-sqlite.mjs) and plays every way into and out of an
   account: signing up and in, the wrong answers, the locks, recovery, the
   cloud save's compare-and-swap, signing out everywhere, deleting. Each
   "device" keeps its own cookie, the way two browsers would.

   No packages and no network. About ten seconds, most of it scrypt.
   ========================================================================= */
import { makeD1 } from './lib/d1-sqlite.mjs';
import { createHash } from 'node:crypto';

const worker = (await import('../src/index.js')).default;
const { pruneAuth } = await import('../src/auth.js');

const DB = makeD1();
const env = { DB, ASSETS: { fetch: () => new Response('asset') } };

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''));
}
const section = t => console.log('· ' + t);

/* A browser: its own cookie, address and page origin. */
function device(o = {}) {
  const d = { cookie: '', ip: o.ip || '203.0.113.7', base: o.base || 'https://voidrunner.online',
              origin: o.origin === undefined ? (o.base || 'https://voidrunner.online') : o.origin, last: null };
  d.call = async (method, path, body, extra = {}) => {
    const headers = { 'cf-connecting-ip': d.ip };
    if (d.origin) headers.origin = d.origin;
    if (o.ua) headers['user-agent'] = o.ua;
    if (d.cookie) headers.cookie = 'other=1; vr_s=' + d.cookie;
    if (body !== undefined) headers['content-type'] = extra.ctype || 'application/json';
    const res = await worker.fetch(new Request(d.base + path, {
      method, headers, body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
    }), o.env || env);
    const sc = res.headers.get('set-cookie') || '';
    const m = /^vr_s=([^;]*)/.exec(sc);
    if (m) d.cookie = m[1];
    let data = null;
    try { data = await res.json(); } catch (e) {}
    d.last = { status: res.status, d: data, cookie: sc };
    return d.last;
  };
  d.op = (op, body = {}) => d.call('POST', '/api/account', Object.assign({ op }, body));
  return d;
}
const one = q => DB.sql.prepare(q).get();
const count = (t, where = '1=1') => one(`SELECT COUNT(*) AS n FROM ${t} WHERE ${where}`).n;
const sha = s => createHash('sha256').update(s).digest('hex');
const PID_A = 'a'.repeat(32), PID_B = 'b'.repeat(32), PID_C = 'c'.repeat(32);

const t0 = Date.now();

section('signed out');
{
  const d = device();
  const r = await d.call('GET', '/api/account');
  ok(r.status === 200 && r.d.account === null, 'no cookie: no account', r);
  const s = await d.call('GET', '/api/account/save');
  ok(s.status === 401, 'no cookie: no save', s);
  const lo = await d.op('logout');
  ok(lo.status === 200, 'signing out while signed out is harmless', lo);
}

section('sign up: the rules');
{
  const d = device({ ip: '198.51.100.1' });
  for (const [name, pass, want, why] of [
    ['ab', 'long enough pass', 400, 'too short a name'],
    ['has space', 'long enough pass', 400, 'a space'],
    ['x'.repeat(17), 'long enough pass', 400, 'too long a name'],
    ['Admin', 'long enough pass', 409, 'reserved, in any case'],
    ['pilotx', 'short', 400, 'a short password'],
    ['pilotx', 'password', 400, 'a famous password'],
    ['pilotx', 'PiLoTx'.padEnd(6, 'x'), 400, 'short again'],
    ['pilotxyz', 'pilotxyz', 400, 'the name as the password'],
    ['pilotx', 'aaaaaaaaaa', 400, 'one character repeated']]) {
    const r = await d.op('register', { name, pass });
    ok(r.status === want, 'sign up refused: ' + why, r);
  }
  ok(count('accounts') === 0, 'nothing was made');
  const r = await d.call('POST', '/api/account', '{"op":"register"', {});
  ok(r.status === 400, 'broken JSON', r);
  const f = await d.call('POST', '/api/account', 'op=register&name=a&pass=b', { ctype: 'application/x-www-form-urlencoded' });
  ok(f.status === 415, 'a form post is not JSON', f);
  const x = await d.op('teleport');
  ok(x.status === 400, 'an unknown op', x);
}

section('sign up');
let CODE = '';
const A = device();
{
  const r = await A.op('register', { name: 'Pilot_1', pass: 'correct horse', pid: PID_A });
  ok(r.status === 201, 'made', r);
  ok(r.d && r.d.account && r.d.account.name === 'pilot_1' && r.d.account.display === 'Pilot_1', 'name and display', r.d);
  ok(r.d && !('id' in r.d.account), 'the account id never leaves the Worker', r.d);
  CODE = r.d && r.d.recovery;
  ok(/^[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}-[2-9A-Z]{4}$/.test(CODE || ''), 'a recovery code', CODE);
  const c = r.cookie;
  for (const part of ['HttpOnly', 'Secure', 'SameSite=Lax', 'Path=/api', 'Domain=voidrunner.online', 'Max-Age=7776000'])
    ok(c.includes(part), 'cookie: ' + part, c);
  const acct = one("SELECT * FROM accounts WHERE name = 'pilot_1'");
  ok(acct && /^scrypt\$14\$8\$1\$[0-9a-f]{32}\$[0-9a-f]{64}$/.test(acct.pass), 'the password is a scrypt hash', acct && acct.pass);
  ok(acct && acct.recovery === sha(CODE.replace(/-/g, '')), 'the code is kept as a hash');
  ok(acct && acct.pid === PID_A, 'the first profile is remembered');
  const sess = one('SELECT * FROM sessions');
  ok(sess && sess.id === sha(A.cookie) && sess.id !== A.cookie, 'only the token\'s hash is stored');
  ok(count('account_pids', `pid = '${PID_A}'`) === 1, 'the profile is linked');
  const again = await device({ ip: '198.51.100.9' }).op('register', { name: 'PILOT_1', pass: 'another horse' });
  ok(again.status === 409, 'the same name in another case is taken', again);
  const me = await A.call('GET', '/api/account');
  ok(me.d.account && me.d.account.display === 'Pilot_1', 'signed in after sign up', me.d);
  ok(!me.cookie, 'a fresh session is not re-sent', me.cookie);
}

section('sign in');
const B = device({ ip: '203.0.113.8' });
{
  const wrong = await B.op('login', { name: 'pilot_1', pass: 'wrong horse' });
  const nobody = await B.op('login', { name: 'nobody_here', pass: 'wrong horse' });
  ok(wrong.status === 401 && nobody.status === 401, 'wrong password and unknown name both fail');
  ok(JSON.stringify(wrong.d) === JSON.stringify(nobody.d), 'and say exactly the same thing', [wrong.d, nobody.d]);
  ok(!B.cookie, 'no cookie for a failure');
  const r = await B.op('login', { name: '  PILOT_1 ', pass: 'correct horse', pid: PID_B });
  ok(r.status === 200 && r.d.account.name === 'pilot_1', 'signed in, name read loosely', r);
  ok(B.cookie && B.cookie !== A.cookie, 'its own session');
  ok(count('sessions') === 2, 'two devices');
  ok(count('account_pids') === 2, 'both profiles linked');
  ok(one("SELECT pid FROM accounts WHERE name = 'pilot_1'").pid === PID_A, 'the first profile stays the first');
}

section('the cloud save');
{
  const g = await A.call('GET', '/api/account/save');
  ok(g.status === 200 && g.d.rev === 0 && g.d.save === null, 'empty to begin with', g.d);
  const p1 = await A.call('PUT', '/api/account/save', { rev: 0, save: { best: 10, codexE: ['grunt'] },
    unlocks: { chars: ['runner', 'ember', '<script>'], awake: ['ember'], chal: ['ch_glass'], ups: ['u_glass'], junk: [1] }, pid: PID_A });
  ok(p1.status === 200 && p1.d.rev === 1, 'first write', p1);
  const stale = await B.call('PUT', '/api/account/save', { rev: 0, save: { best: 5 } });
  ok(stale.status === 409 && stale.d.rev === 1 && stale.d.save.best === 10, 'a stale write is refused, with the newer save', stale);
  const p2 = await B.call('PUT', '/api/account/save', { rev: 1, save: { best: 12, codexE: ['grunt', 'mite'] }, unlocks: {} });
  ok(p2.status === 200 && p2.d.rev === 2, 'written on the newer revision', p2);
  const again = await A.call('PUT', '/api/account/save', { rev: 1, save: { best: 11 } });
  ok(again.status === 409 && again.d.rev === 2, 'and now A is the stale one', again.d);
  const got = await A.call('GET', '/api/account/save');
  ok(got.d.rev === 2 && got.d.save.best === 12, 'read back', got.d);
  const u = JSON.parse(one('SELECT unlocks FROM saves').unlocks);
  ok(JSON.stringify(u) === JSON.stringify({ v: 1, chars: [], awake: [], chal: [], ups: [] }), 'unlocks cleaned to the known lists', u);
  const p3 = await A.call('PUT', '/api/account/save', { rev: 2, save: { best: 13 },
    unlocks: { chars: ['runner', 'ember', '<script>', 'ember', 'x0'], awake: ['ember', 'x0'], chal: ['ch_glass'], ups: ['u_glass'], junk: [1] } });
  const u3 = JSON.parse(one('SELECT unlocks FROM saves').unlocks);
  // x0: the tests' stand-in for a pilot from outside the game's file (OUTSIDE PILOTS, the vault)
  ok(p3.status === 200 && JSON.stringify(u3) === JSON.stringify({ v: 1, chars: ['runner', 'ember'], awake: ['ember'], chal: ['ch_glass'], ups: ['u_glass'] }),
     'unlocks: ids only, once each, and only the game\'s own pilots', u3);
  for (const [body, want, why] of [
    [{ rev: -1, save: {} }, 400, 'a negative revision'],
    [{ rev: 3, save: [] }, 400, 'a save that is a list'],
    [{ rev: 3 }, 400, 'no save'],
    [{ rev: 3, save: { blob: 'x'.repeat(310 * 1024) } }, 413, 'too large']]) {
    const r = await A.call('PUT', '/api/account/save', body);
    ok(r.status === want, 'save refused: ' + why, r.status);
  }
  const form = await A.call('PUT', '/api/account/save', '{"rev":3,"save":{}}', { ctype: 'text/plain' });
  ok(form.status === 415, 'a save must be declared JSON', form.status);
  const evil = device({ origin: 'https://evil.example' });
  evil.cookie = A.cookie;
  const e = await evil.call('PUT', '/api/account/save', { rev: 3, save: { best: 0 } });
  ok(e.status === 403, 'another site cannot write, even holding the cookie', e);
  const eo = await evil.op('logout');
  ok(eo.status === 403 && count('sessions') === 2, 'or sign anybody out', eo);
  const www = device({ origin: 'https://www.voidrunner.online', base: 'https://www.voidrunner.online' });
  www.cookie = A.cookie;
  const pr = await www.call('GET', '/api/account/save');
  ok(pr.status === 200 && pr.d.save.best === 13, 'the www address reads the same session', pr.status);
}

section('sign out other devices');
{
  const r = await A.op('logout-others');
  ok(r.status === 200, 'done', r);
  const b = await B.call('GET', '/api/account');
  ok(b.d.account === null, 'B is signed out');
  const a = await A.call('GET', '/api/account');
  ok(a.d.account !== null, 'A is not');
  await B.op('login', { name: 'pilot_1', pass: 'correct horse' });
}

section('change password');
{
  const wrong = await A.op('password', { pass: 'not it at all', next: 'battery staple' });
  ok(wrong.status === 401, 'the current password is checked', wrong);
  const weak = await A.op('password', { pass: 'correct horse', next: 'short' });
  ok(weak.status === 400, 'the new one must pass the same rules', weak);
  const r = await A.op('password', { pass: 'correct horse', next: 'battery staple' });
  ok(r.status === 200, 'changed', r);
  ok((await B.call('GET', '/api/account')).d.account === null, 'every other device signed out');
  ok((await A.call('GET', '/api/account')).d.account !== null, 'this one kept');
  const old = await device({ ip: '192.0.2.50' }).op('login', { name: 'pilot_1', pass: 'correct horse' });
  ok(old.status === 401, 'the old password is gone', old);
  const nu = await B.op('login', { name: 'pilot_1', pass: 'battery staple' });
  ok(nu.status === 200, 'the new one works', nu);
}

section('recovery');
{
  const C = device({ ip: '192.0.2.77' });
  const wrong = await C.op('recover', { name: 'pilot_1', code: 'AAAA-BBBB-CCCC-DDDD', next: 'tr0ub4dor&3' });
  ok(wrong.status === 401, 'a wrong code', wrong);
  const weak = await C.op('recover', { name: 'pilot_1', code: CODE, next: 'password' });
  ok(weak.status === 400, 'a weak new password, before the code is spent', weak);
  const r = await C.op('recover', { name: 'Pilot_1', code: CODE.toLowerCase().replace(/-/g, ' '), next: 'tr0ub4dor&3', pid: PID_C });
  ok(r.status === 200 && r.d.account.name === 'pilot_1', 'recovered, the code typed loosely', r);
  ok(r.d.recovery && r.d.recovery !== CODE, 'with a new code', r.d);
  ok(count('sessions') === 1 && C.cookie, 'every other device signed out, this one in');
  ok((await A.call('GET', '/api/account')).d.account === null, 'A included');
  const spent = await device({ ip: '192.0.2.78' }).op('recover', { name: 'pilot_1', code: CODE, next: 'another one9' });
  ok(spent.status === 401, 'the old code is spent', spent);
  const old = await device({ ip: '192.0.2.79' }).op('login', { name: 'pilot_1', pass: 'battery staple' });
  ok(old.status === 401, 'the old password is gone', old);
  CODE = r.d.recovery;
  const in2 = await A.op('login', { name: 'pilot_1', pass: 'tr0ub4dor&3' });
  ok(in2.status === 200, 'the new one works', in2);
  ok(count('account_pids') === 3, 'the recovering profile is linked too');
}

section('locks');
{
  const M = device({ ip: '100.64.0.1' });
  for (let i = 0; i < 8; i++) await M.op('login', { name: 'pilot_1', pass: 'guess ' + i });
  const locked = await M.op('login', { name: 'pilot_1', pass: 'tr0ub4dor&3' });
  ok(locked.status === 429 && locked.d.retryIn > 0, 'eight misses lock the name from that address, even to the right password', locked);
  const other = await device({ ip: '100.64.0.2' }).op('login', { name: 'pilot_1', pass: 'tr0ub4dor&3' });
  ok(other.status === 200, 'another address (the rest of the class) is unaffected', other);
  const rec = await M.op('recover', { name: 'pilot_1', code: CODE, next: 'whatever 123' });
  ok(rec.status === 429, 'recovery shares the lock', rec.status);
  // the address as a whole: fifty misses over many names
  const S = device({ ip: '100.64.0.3' });
  for (let i = 0; i < 50; i++) await S.op('login', { name: 'name' + (i % 40), pass: 'guessing' });
  const s = await S.op('login', { name: 'pilot_1', pass: 'tr0ub4dor&3' });
  ok(s.status === 429, 'fifty misses lock the address', s.status);
  // sign-ups by the hour
  const N = device({ ip: '100.64.0.4' });
  let made = 0, last = null;
  for (let i = 0; i < 21; i++) {
    last = await N.op('register', { name: 'class_' + i, pass: 'pass for ' + i });
    if (last.status === 201) made++;
  }
  ok(made === 20 && last.status === 429, 'twenty sign-ups an hour from one address', { made, last: last.status });
}

section('sessions: renewal, expiry, the cap');
{
  const sid = sha(A.cookie);
  DB.sql.prepare('UPDATE sessions SET seen = ?, expires = ? WHERE id = ?').run(Date.now() - 2 * 86400000, Date.now() + 5000, sid);
  const r = await A.call('GET', '/api/account');
  ok(r.d.account && /Max-Age=7776000/.test(r.cookie), 'a day unseen: renewed, and the cookie sent again', r.cookie);
  ok(one(`SELECT expires FROM sessions WHERE id = '${sid}'`).expires > Date.now() + 80 * 86400000, 'for another 90 days');
  DB.sql.prepare('UPDATE sessions SET expires = ? WHERE id = ?').run(Date.now() - 1, sid);
  const gone = await A.call('GET', '/api/account');
  ok(gone.d.account === null && count('sessions', `id = '${sid}'`) === 0, 'expired: signed out and swept');
  const many = device({ ip: '100.64.0.9' });
  for (let i = 0; i < 22; i++) await many.op('login', { name: 'class_1', pass: 'pass for 1' });
  const id = one("SELECT id FROM accounts WHERE name = 'class_1'").id;
  ok(count('sessions', `account = '${id}'`) === 20, 'twenty devices at most', count('sessions', `account = '${id}'`));
  ok((await many.call('GET', '/api/account')).d.account !== null, 'the newest is kept');
  DB.sql.prepare('UPDATE sessions SET expires = 0 WHERE account = ?').run(id);
  DB.sql.prepare('UPDATE auth_gate SET until = 0').run();
  const pending = [];
  await worker.scheduled({ cron: '5 0 * * *' }, env, { waitUntil: p => pending.push(p) });
  await Promise.allSettled(pending);
  ok(count('sessions', `account = '${id}'`) === 0 && count('auth_gate') === 0, 'the daily sweep clears the expired');
}

section('away from voidrunner.online');
{
  const L = device({ base: 'http://localhost:8787', ip: '127.0.0.1' });
  const r = await L.op('register', { name: 'local_dev', pass: 'local password' });
  ok(r.status === 201, 'signed up on localhost', r.status);
  ok(!/Domain=/.test(r.cookie) && !/Secure/.test(r.cookie), 'the cookie stays on that address, without Secure on http', r.cookie);
  const W = device({ base: 'https://voidrunner.play101.workers.dev', ip: '127.0.0.2' });
  const w = await W.op('login', { name: 'local_dev', pass: 'local password' });
  ok(w.status === 200 && !/Domain=/.test(w.cookie) && /Secure/.test(w.cookie), 'workers.dev: its own address, Secure', w.cookie);
}

section('delete');
{
  const wrong = await A.op('login', { name: 'pilot_1', pass: 'tr0ub4dor&3' });
  ok(wrong.status === 200, 'signed in to delete');
  const no = await A.op('delete', { pass: 'not the password' });
  ok(no.status === 401, 'the password is asked for', no);
  const id = one("SELECT id FROM accounts WHERE name = 'pilot_1'").id;
  const r = await A.op('delete', { pass: 'tr0ub4dor&3' });
  ok(r.status === 200 && /Max-Age=0/.test(r.cookie), 'deleted, and the cookie cleared', r);
  for (const t of ['sessions', 'account_pids', 'saves'])
    ok(count(t, `account = '${id}'`) === 0, 'nothing left in ' + t);
  ok(count('accounts', `id = '${id}'`) === 0, 'nor the account');
  const back = await device({ ip: '192.0.2.200' }).op('login', { name: 'pilot_1', pass: 'tr0ub4dor&3' });
  ok(back.status === 401, 'it cannot be signed in to', back.status);
  const reuse = await device({ ip: '192.0.2.201' }).op('register', { name: 'Pilot_1', pass: 'brand new one' });
  ok(reuse.status === 201, 'and the name is free again', reuse.status);
}

section('Turnstile on sign-up');
{
  const calls = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    const body = JSON.parse(init.body);
    calls.push({ url: String(url), body });
    if (body.response === 'throw') throw new Error('network down');
    const answer = { good: { success: true, action: 'signup' }, other: { success: true, action: 'login' },
                     bad: { success: false, 'error-codes': ['invalid-input-response'] },
                     bare: { success: true },
                     testkey: { success: true, metadata: { result_with_testing_key: true } } }[body.response];
    return new Response(JSON.stringify(answer || { success: false }));
  };
  const envT = Object.assign({}, env, { TURNSTILE_SITE_KEY: '0xSITE', TURNSTILE_SECRET: '0xSECRET' });
  const T = device({ ip: '198.51.100.90', env: envT });

  const off = await device({ ip: '198.51.100.91' }).call('GET', '/api/account');
  ok(off.d.turnstile === null, 'no keys: no widget', off.d);
  const half = await device({ ip: '198.51.100.91', env: Object.assign({}, env, { TURNSTILE_SITE_KEY: '0xSITE' }) })
    .call('GET', '/api/account');
  ok(half.d.turnstile === null, 'a site key without its secret is still off', half.d);
  const on = await T.call('GET', '/api/account');
  ok(on.d.turnstile === '0xSITE', 'both keys: the page is handed the site key', on.d);

  let r = await T.op('register', { name: 'ts_none', pass: 'a fine password' });
  ok(r.status === 400 && r.d.turnstile === true && /person/.test(r.d.error), 'no token: refused', r);
  ok(calls.length === 0, 'and Cloudflare is not asked about nothing');
  for (const [tok, why] of [['bad', 'a failed check'], ['other', 'a token earned for another action'],
                            ['bare', 'a pass that names no action'], ['throw', 'a check that cannot be made']]) {
    r = await T.op('register', { name: 'ts_' + tok, pass: 'a fine password', turnstile: tok });
    ok(r.status === 400 && r.d.turnstile === true, why + ': refused', r);
  }
  ok(count('accounts', "name IN ('ts_none', 'ts_bad', 'ts_other', 'ts_bare', 'ts_throw')") === 0, 'none of them made an account');
  r = await T.op('register', { name: 'ts_testkey', pass: 'a fine password', turnstile: 'testkey' });
  ok(r.status === 201, "Cloudflare's testing keys pass, as they would anywhere", r);
  r = await T.op('register', { name: 'ts_good', pass: 'a fine password', turnstile: 'good' });
  ok(r.status === 201, 'a person: signed up', r);
  const last = calls[calls.length - 1] || { body: {} };
  ok(last.url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify' && last.body.secret === '0xSECRET' &&
     last.body.response === 'good' && last.body.remoteip === '198.51.100.90',
     'asked with the secret, the token and the address', last);
  const before = calls.length;
  r = await device({ ip: '198.51.100.92', env: envT }).op('register', { name: 'TS_GOOD', pass: 'a fine password', turnstile: 'good' });
  ok(r.status === 409 && calls.length === before, 'a taken name spends no token', r.status);
  r = await device({ ip: '198.51.100.93', env: envT }).op('login', { name: 'ts_good', pass: 'a fine password' });
  ok(r.status === 200 && calls.length === before, 'signing in is never asked', r.status);
  r = await device({ ip: '198.51.100.94' }).op('register', { name: 'ts_off', pass: 'a fine password' });
  ok(r.status === 201, 'and with no keys, sign-up works as it did', r.status);
  globalThis.fetch = realFetch;
}

section('the device list');
{
  const { deviceOf } = await import('../src/account.js');
  const UA = {
    cros: 'Mozilla/5.0 (X11; CrOS x86_64 14541.0.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
    edge: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0'
  };
  const label = ua => deviceOf(new Request('https://x/', { headers: ua ? { 'user-agent': ua } : {} }));
  for (const [ua, want] of [
    [UA.cros, 'Chrome on ChromeOS'], [UA.iphone, 'Safari on iPhone'], [UA.edge, 'Edge on Windows'],
    ['Mozilla/5.0 (Android 14; Mobile; rv:121.0) Gecko/121.0 Firefox/121.0', 'Firefox on Android'],
    ['Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/23.0 Chrome/115.0.0.0 Mobile Safari/537.36', 'Samsung Internet on Android'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0', 'Opera on Windows'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Safari/605.1.15', 'Safari on Mac'],
    ['Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0 Mobile/15E148 Safari/604.1', 'Chrome on iPad'],
    ['', 'A browser on some device']])
    ok(label(ua) === want, 'called "' + want + '"', label(ua));

  const A = device({ ip: '192.0.2.150', ua: UA.cros }), B = device({ ip: '192.0.2.151', ua: UA.iphone });
  const C = device({ ip: '192.0.2.152', ua: UA.edge });
  ok((await A.op('register', { name: 'many_devices', pass: 'a fine password' })).status === 201, 'signed up on a Chromebook');
  ok((await B.op('login', { name: 'many_devices', pass: 'a fine password' })).status === 200, 'in on an iPhone');
  ok((await C.op('login', { name: 'many_devices', pass: 'a fine password' })).status === 200, 'and on Windows');
  let r = await A.op('devices');
  const list = (r.d && r.d.devices) || [];
  ok(r.status === 200 && list.length === 3, 'three devices', r.d);
  ok(list.filter(x => x.current).length === 1 && (list.find(x => x.current) || {}).device === 'Chrome on ChromeOS',
     'this one is marked', list);
  ok(['Safari on iPhone', 'Edge on Windows'].every(n => list.some(x => x.device === n && !x.current)), 'the others by name', list);
  ok(list.every(x => /^[0-9a-f]{16}$/.test(x.id) && x.seen && x.created), 'each with a short handle and its dates', list);
  const sids = DB.sql.prepare(`SELECT s.id FROM sessions s JOIN accounts a ON a.id = s.account
                               WHERE a.name = 'many_devices'`).all().map(x => x.id);
  ok(!sids.some(full => JSON.stringify(r.d).includes(full)), 'never a whole session id');

  const iphone = list.find(x => x.device === 'Safari on iPhone') || {};
  r = await A.op('logout-device', { id: iphone.id });
  ok(r.status === 200, 'the iPhone signed out from the Chromebook', r);
  ok((await B.call('GET', '/api/account')).d.account === null, 'and the iPhone knows it');
  ok((await C.call('GET', '/api/account')).d.account !== null, 'Windows is untouched');
  r = await A.op('logout-device', { id: (list.find(x => x.current) || {}).id });
  ok(r.status === 400, 'this device is signed out with SIGN OUT, not from the list', r.status);
  r = await A.op('logout-device', { id: 'zz' });
  ok(r.status === 400, 'a bad handle', r.status);
  r = await A.op('logout-device', { id: iphone.id });
  ok(r.status === 404, 'a device already gone', r.status);

  const other = device({ ip: '192.0.2.153' });
  ok((await other.op('register', { name: 'someone_else', pass: 'a fine password' })).status === 201, 'another account');
  const win = list.find(x => x.device === 'Edge on Windows') || {};
  r = await other.op('logout-device', { id: win.id });
  ok(r.status === 404 && (await C.call('GET', '/api/account')).d.account !== null,
     'which cannot sign out this account\'s devices', r.status);
  r = await device({ ip: '192.0.2.154' }).op('devices');
  ok(r.status === 401, 'signed out: no list', r.status);
}

section('a sessions table from before the device list');
{
  const old = makeD1();
  old.sql.exec(`CREATE TABLE sessions (id TEXT PRIMARY KEY, account TEXT NOT NULL, created INTEGER NOT NULL,
                seen INTEGER NOT NULL, expires INTEGER NOT NULL)`);
  old.sql.prepare('INSERT INTO sessions VALUES (?, ?, ?, ?, ?)').run('f'.repeat(64), 'acct', 1, 1, Date.now() + 1e9);
  const fresh = await import('../src/auth.js?before-devices');     // its own once-per-isolate flag
  await fresh.ensureAuth(old);
  const cols = old.sql.prepare('PRAGMA table_info(sessions)').all().map(c => c.name);
  ok(cols.includes('device'), 'the device column is added', cols);
  ok(old.sql.prepare('SELECT COUNT(*) AS n FROM sessions').get().n === 1, 'and the session in it kept');
  const again = await import('../src/auth.js?before-devices-2');
  let threw = null;
  try { await again.ensureAuth(old); } catch (e) { threw = e; }
  ok(!threw, 'asking again is harmless', String(threw));
}

section('the rest of the Worker is untouched');
{
  const r = await worker.fetch(new Request('https://voidrunner.online/api/nope'), env);
  ok(r.status === 404, 'an unknown API path');
  const a = await worker.fetch(new Request('https://voidrunner.online/index.html'), env);
  ok((await a.text()) === 'asset', 'files still go to assets');
}

console.log(`\n${passes} passed, ${fails} failed  (${((Date.now() - t0) / 1000).toFixed(1)} s)`);
process.exit(fails ? 1 : 0);
