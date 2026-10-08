/* ===========================================================================
   THE PATREON TEST — `npm run test:patreon` (src/patreon.js)

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), and
   a Patreon of our own in place of fetch: it hands out codes, trades them
   for tokens only to the right app at the right return address, and
   answers /identity with the memberships the test gives each user. Then
   the whole trip, start to finish, as a browser makes it: the link, the
   "allow?" screen's answer, the way back, the gate, the webhook, the
   unlink, and everything that must be refused on the way.
   ========================================================================= */
import { createHmac } from 'node:crypto';
import { makeD1 } from './lib/d1-sqlite.mjs';

const worker = (await import('../src/index.js')).default;
const { pruneAuth } = await import('../src/auth.js');
const { CAMPAIGN } = await import('../src/patreon.js');

const DB = makeD1();
const SECRETS = { PATREON_CLIENT_ID: 'cid-123', PATREON_CLIENT_SECRET: 'csecret-456', PATREON_WEBHOOK_SECRET: 'hook-789' };
let env = Object.assign({ DB, ASSETS: { fetch: () => new Response('asset') } }, SECRETS);
const BACK = 'https://voidrunner.online/api/patreon/back';

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const sql = (q, ...p) => DB.sql.prepare(q).run(...p);
const one = (q, ...p) => DB.sql.prepare(q).get(...p);

/* ------------------------------ our Patreon ------------------------------ */
const PAT = { users: {}, codes: {}, tokens: {}, calls: [], down: false };
// a Patreon user, and (or not) their membership: { campaign, status, cents }
const patron = (id, m) => { PAT.users[id] = { id, m }; return id; };
let codeN = 0;
const jsonRes = (b, status = 200) => new Response(JSON.stringify(b), { status, headers: { 'content-type': 'application/json' } });
globalThis.fetch = async (url, init = {}) => {
  const u = new URL(typeof url === 'string' ? url : url.url);
  if (u.hostname !== 'www.patreon.com') throw new Error('the Worker fetched somewhere else: ' + u.href);
  PAT.calls.push({ url: u.href, init });
  if (PAT.down) return new Response('down', { status: 503 });
  if (u.pathname === '/api/oauth2/token' && init.method === 'POST') {
    const f = new URLSearchParams(String(init.body));
    if (f.get('client_id') !== SECRETS.PATREON_CLIENT_ID || f.get('client_secret') !== SECRETS.PATREON_CLIENT_SECRET)
      return jsonRes({ error: 'invalid_client' }, 401);
    if (f.get('grant_type') !== 'authorization_code' || f.get('redirect_uri') !== BACK) return jsonRes({ error: 'invalid_request' }, 400);
    const who = PAT.codes[f.get('code')];
    delete PAT.codes[f.get('code')];                     // a code is good once
    if (!who) return jsonRes({ error: 'invalid_grant' }, 400);
    const token = 'tok-' + who + '-' + (++codeN);
    PAT.tokens[token] = who;
    return jsonRes({ access_token: token, refresh_token: 'refresh-' + token, expires_in: 2678400, scope: 'identity', token_type: 'Bearer' });
  }
  if (u.pathname === '/api/oauth2/v2/identity') {
    const who = PAT.tokens[String((init.headers || {}).authorization || '').replace(/^Bearer /, '')];
    if (!who) return jsonRes({ errors: [{ status: '401' }] }, 401);
    const usr = PAT.users[who], m = usr.m;
    const included = m ? [
      { type: 'member', id: 'mem-' + who, attributes: { patron_status: m.status, currently_entitled_amount_cents: m.cents },
        relationships: { campaign: { data: { id: m.campaign || CAMPAIGN, type: 'campaign' } } } },
      { type: 'campaign', id: m.campaign || CAMPAIGN, attributes: {} }] : [];
    return jsonRes({ data: { type: 'user', id: who, attributes: {},
                             relationships: { memberships: { data: m ? [{ id: 'mem-' + who, type: 'member' }] : [] } } }, included });
  }
  return jsonRes({ error: 'no such route' }, 404);
};

/* ------------------------------- a browser ------------------------------- */
let ipN = 0;
function device(origin = 'https://voidrunner.online', base = 'https://voidrunner.online') {
  const d = { cookie: '', ip: '10.1.0.' + (++ipN) };
  d.raw = async (method, path, body, extra = {}) => {
    const headers = Object.assign({ 'cf-connecting-ip': d.ip }, origin ? { origin } : {}, extra);
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined && !headers['content-type']) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request(base + path,
      { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    return res;
  };
  d.call = async (...a) => {
    const res = await d.raw(...a);
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, d: data };
  };
  return d;
}
async function signUp(name) {
  const d = device();
  const r = await d.call('POST', '/api/account', { op: 'register', name, pass: 'correct horse ' + name, pid: (++ipN).toString(16).padStart(32, '0') });
  if (r.status !== 201) throw new Error('register ' + name + ': ' + r.status + ' ' + JSON.stringify(r.d));
  d.name = name.toLowerCase();
  d.id = one('SELECT id FROM accounts WHERE name = ?', d.name).id;
  return d;
}
// where a redirect goes, and what it told the player
const where = res => { const l = res.headers.get('location'); return l ? new URL(l) : null; };
const howOf = res => { const l = where(res); return l ? l.searchParams.get('patreon') : null; };
// the trip: our link, Patreon's screen (allowed by `who`, or denied), and back
async function trip(d, who, { deny = false, swap = null } = {}) {
  const go = await d.raw('GET', '/api/patreon/link', undefined, { origin: '' });
  const to = where(go);
  const state = to && to.searchParams.get('state');
  const code = 'code-' + (++codeN);
  if (who) PAT.codes[code] = who;
  const back = await (swap || d).raw('GET', '/api/patreon/back?' + (deny ? 'error=access_denied&state=' + state : 'code=' + code + '&state=' + state),
                                     undefined, { origin: '' });
  return { go, to, state, code, back, how: howOf(back) };
}
const status = d => d.call('GET', '/api/patreon');
const looks = async d => (await d.call('GET', '/api/account/look')).d;
const ownsAll = L => ['banner', 'picture', 'decal'].every(k => L.items[k].find(i => i.id === 'supporter').owned);
const linkRow = d => one('SELECT * FROM patreon_links WHERE account = ?', d.id);
const sign = body => createHmac('md5', SECRETS.PATREON_WEBHOOK_SECRET).update(body).digest('hex');
function hook(event, user, attrs, { campaign = CAMPAIGN, sig = null } = {}) {
  const body = JSON.stringify({ data: { type: 'member', id: 'mem-' + user, attributes: attrs,
    relationships: { user: { data: { id: user, type: 'user' } }, campaign: { data: { id: campaign, type: 'campaign' } } } }, included: [] });
  return device(null).call('POST', '/api/patreon/hook', body,
    { 'x-patreon-event': event, 'x-patreon-signature': sig === null ? sign(body) : sig, 'content-type': 'application/json' });
}
const ACTIVE = (cents = 100) => ({ status: 'active_patron', cents });

/* ---------------------------------------------------------------------- */
section('before anything: signed out, elsewhere, and switched off');
const A = await signUp('Patron_A');
{
  const g = device();
  let r = await g.raw('GET', '/api/patreon/link');
  ok(r.status === 302 && howOf(r) === 'signedout' && where(r).pathname === '/leaderboard/', 'signed out: back to the leaderboard, told so', r.headers.get('location'));
  ok((await g.call('GET', '/api/patreon')).status === 401, 'its status is for the signed in');
  const school = device('https://voidrunner.play101.workers.dev', 'https://voidrunner.play101.workers.dev');
  r = await school.raw('GET', '/api/patreon/link');
  ok(howOf(r) === 'elsewhere' && where(r).host === 'voidrunner.play101.workers.dev', 'the school address is told to link from voidrunner.online, and is not sent there', r.headers.get('location'));
  const keep = env;
  env = { DB, ASSETS: keep.ASSETS };
  r = await A.raw('GET', '/api/patreon/link');
  ok(howOf(r) === 'off' && where(r).hash === '#u/patron_a', 'no app secrets: the link says it is off, on the player\'s own profile', r.headers.get('location'));
  ok((await A.call('GET', '/api/patreon')).d.on === false, 'and the status says so');
  ok((await hook('members:pledge:create', '1', {})).status === 503, 'no webhook secret: the webhook refuses');
  env = keep;
  ok(PAT.calls.length === 0, 'Patreon was never asked');
}

section('the link: off to Patreon\'s screen, with a state of its own');
{
  const r = await A.raw('GET', '/api/patreon/link');
  const to = where(r);
  ok(r.status === 302 && to.origin + to.pathname === 'https://www.patreon.com/oauth2/authorize', 'to Patreon\'s authorize page', r.headers.get('location'));
  ok(to.searchParams.get('response_type') === 'code' && to.searchParams.get('client_id') === SECRETS.PATREON_CLIENT_ID
     && to.searchParams.get('redirect_uri') === BACK, 'a code, for this app, back to the registered address', to.search);
  ok(to.searchParams.get('scope') === 'identity', 'asking for identity only: their membership of this campaign and nothing else');
  const state = to.searchParams.get('state');
  ok(state && state.length >= 32, 'a long random state');
  ok(one('SELECT COUNT(*) AS n FROM patreon_states WHERE account = ?', A.id).n === 1, 'one trip held for the account');
  ok(!JSON.stringify(DB.sql.prepare('SELECT * FROM patreon_states').all()).includes(state), 'kept as its hash, never as itself');
  await A.raw('GET', '/api/patreon/link');
  ok(one('SELECT COUNT(*) AS n FROM patreon_states WHERE account = ?', A.id).n === 1, 'a second click replaces the first trip');
  PAT.codes = {};
}

section('back from Patreon: a $1 patron is linked and opens the SUPPORTER looks');
{
  ok(!ownsAll(await looks(A)), 'locked before');
  const u = patron('918273645501', ACTIVE(100));
  const t = await trip(A, u);
  ok(t.back.status === 302 && t.how === 'linked' && where(t.back).hash === '#u/patron_a', 'linked, and on to the profile told so', t.back.headers.get('location'));
  const tok = PAT.calls.find(c => c.url.endsWith('/api/oauth2/token'));
  ok(tok && /x-www-form-urlencoded/.test(tok.init.headers['content-type']), 'the code traded as a form, on the server');
  ok(PAT.calls.some(c => c.url.includes('/api/oauth2/v2/identity') && /^Bearer tok-918273645501-/.test(c.init.headers.authorization)), 'then asked who they are, with that token');
  const row = linkRow(A);
  ok(row && row.patreon === '918273645501' && row.active === 1 && row.cents === 100 && row.status === 'active_patron', 'the link: their Patreon id and that they support', row);
  ok(!JSON.stringify(DB.sql.prepare("SELECT * FROM patreon_links").all()).includes('tok-')
     && !JSON.stringify(DB.sql.prepare("SELECT * FROM patreon_states").all()).includes('tok-'), 'the token is not kept anywhere');
  const L = await looks(A);
  ok(ownsAll(L) && L.items.decal.find(i => i.id === 'supporter').why === 'A PATREON SUPPORTER', 'all three SUPPORTER looks are its own, and say why', L.items.decal.find(i => i.id === 'supporter'));
  ok((await A.call('PUT', '/api/account/look', { decals: ['supporter'], banner: 'supporter' })).status === 200, 'and may be worn');
  const P = await device(null).call('GET', '/api/boards?user=patron_a');
  ok(P.d.look.banner === 'supporter' && P.d.look.decals[0].id === 'supporter', 'on the public profile', P.d.look);
  ok(!JSON.stringify(P.d).includes('918273645501'), 'which never shows the Patreon id');
  const s = await status(A);
  ok(s.status === 200 && s.d.linked && s.d.supporter && !s.d.flagged && s.d.on, 'its status: linked, supporting', s.d);
}

section('a state is good once, for its own account, for ten minutes');
{
  const u = patron('1002', ACTIVE(500));
  const B = await signUp('Patron_B');
  let t = await trip(B, u);
  ok(t.how === 'linked', 'B links');
  const again = await B.raw('GET', '/api/patreon/back?code=whatever&state=' + t.state, undefined, { origin: '' });
  ok(howOf(again) === 'expired', 'the same way back twice: refused the second time');
  sql('DELETE FROM patreon_links WHERE account = ?', B.id);
  // a state A started, brought back by B's browser (a link sent to somebody): refused, and spent
  const C = await signUp('Patron_C');
  t = await trip(A, u, { swap: C });
  ok(t.how === 'expired' && !linkRow(C), 'another account\'s trip, finished in this browser: refused, nothing linked', t.how);
  ok(one('SELECT COUNT(*) AS n FROM patreon_states WHERE account = ?', A.id).n === 0, 'and that trip is spent');
  ok(linkRow(A).patreon === '918273645501', 'A\'s own link untouched');
  // too slow
  const go = await C.raw('GET', '/api/patreon/link');
  const state = where(go).searchParams.get('state');
  sql('UPDATE patreon_states SET expires = ? WHERE account = ?', Date.now() - 1, C.id);
  PAT.codes['late'] = u;
  ok(howOf(await C.raw('GET', '/api/patreon/back?code=late&state=' + state)) === 'expired' && !linkRow(C), 'a trip over ten minutes old: refused');
  ok(howOf(await C.raw('GET', '/api/patreon/back?code=late')) === 'expired', 'no state at all: refused');
  ok(howOf(await C.raw('GET', '/api/patreon/back?code=late&state=' + 'x'.repeat(300))) === 'expired', 'a silly state: refused');
  const g = device();
  ok(howOf(await g.raw('GET', '/api/patreon/back?code=late&state=' + state)) === 'signedout', 'signed out on the way back: told so');
}

section('the answers that are not "linked"');
const D = await signUp('Patron_D');
{
  const asked = PAT.calls.length;
  let t = await trip(D, patron('2001', null), { deny: true });
  ok(t.how === 'denied' && !linkRow(D), 'they said no on Patreon\'s screen: nothing linked');
  ok(PAT.calls.length === asked, 'and Patreon was not asked anything');
  t = await trip(D, patron('2002', null));
  ok(t.how === 'notpatron' && linkRow(D).active === 0 && linkRow(D).patreon === '2002', 'a follower with no pledge: linked, not a supporter (a pledge later turns it on)');
  ok(!ownsAll(await looks(D)), 'and the looks stay locked');
  const s = await status(D);
  ok(s.d.linked && !s.d.supporter, 'its status says linked, not supporting', s.d);
  t = await trip(D, patron('2003', { status: 'active_patron', cents: 0 }));
  ok(t.how === 'notpatron' && linkRow(D).active === 0, 'on the free tier: not a supporter');
  t = await trip(D, patron('2004', { status: 'former_patron', cents: 0 }));
  ok(t.how === 'notpatron', 'a former patron: not a supporter');
  t = await trip(D, patron('2005', { status: 'declined_patron', cents: 100 }));
  ok(t.how === 'notpatron', 'a declined payment: not a supporter');
  t = await trip(D, patron('2006', { status: 'active_patron', cents: 1000, campaign: '999' }));
  ok(t.how === 'notpatron' && linkRow(D).active === 0, 'a patron of somebody else\'s campaign: not this one\'s supporter');
  // Patreon failing us
  const go = await D.raw('GET', '/api/patreon/link');
  ok(howOf(await D.raw('GET', '/api/patreon/back?code=never-issued&state=' + where(go).searchParams.get('state'))) === 'failed', 'a code Patreon does not know: failed');
  PAT.down = true;
  t = await trip(D, patron('2007', ACTIVE()));
  PAT.down = false;
  ok(t.how === 'failed' && linkRow(D).patreon === '2006', 'Patreon down: failed, the old link as it was');
}

section('the webhook: signed by Patreon, and only for linked users');
{
  ok((await device(null).call('GET', '/api/patreon/hook')).status === 405, 'POST only');
  let r = await hook('members:pledge:create', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 }, { sig: '0'.repeat(32) });
  ok(r.status === 401 && linkRow(D).active === 0, 'a wrong signature: refused, nothing changed');
  r = await hook('members:pledge:create', '2006', {}, { sig: 'not hex' });
  ok(r.status === 401, 'a signature that is not one: refused');
  r = await device(null).call('POST', '/api/patreon/hook', 'not json', { 'x-patreon-signature': sign('not json'), 'content-type': 'application/json' });
  ok(r.status === 400, 'a signed body that is not a member: refused');
  r = await hook('members:pledge:create', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 });
  ok(r.status === 200 && r.d.linked && linkRow(D).active === 1 && ownsAll(await looks(D)), 'D pledges $1 after linking: the looks open', r.d);
  r = await hook('members:pledge:update', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 0 });
  ok(linkRow(D).active === 0 && !ownsAll(await looks(D)), 'down to the free tier: they close');
  await hook('members:update', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 300 });
  ok(linkRow(D).active === 1 && linkRow(D).cents === 300, 'back up to $3: open again');
  await hook('members:pledge:delete', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 300 });
  ok(linkRow(D).active === 0 && linkRow(D).status === 'ended', 'the pledge deleted: closed at once, whatever the body still says');
  await hook('members:update', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 });
  await hook('members:delete', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 });
  ok(linkRow(D).active === 0, 'the member deleted: closed');
  const rows = one('SELECT COUNT(*) AS n FROM patreon_links').n;
  r = await hook('members:pledge:create', '777', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 });
  ok(r.status === 200 && !r.d.linked && one('SELECT COUNT(*) AS n FROM patreon_links').n === rows, 'a patron nobody linked: answered, and nothing written down', r.d);
  r = await hook('members:pledge:create', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 }, { campaign: '999' });
  ok(r.d && r.d.skipped && linkRow(D).active === 0, 'another campaign\'s member: skipped', r.d);
  r = await hook('members:pledge:create', '2006', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 });
  ok(linkRow(D).active === 1, 'and pledging again opens it again');
}

section('one Patreon, one account: linked again elsewhere, it moves');
const E = await signUp('Patron_E');
{
  const t = await trip(E, '918273645501');
  ok(t.how === 'linked' && linkRow(E).patreon === '918273645501', 'A\'s Patreon linked from E');
  ok(!linkRow(A) && !ownsAll(await looks(A)), 'A no longer holds it');
  const P = await device(null).call('GET', '/api/boards?user=patron_a');
  ok(P.d.look.banner === 'world' && P.d.look.decals.length === 0, 'and A\'s profile is back to the defaults', P.d.look);
  ok(ownsAll(await looks(E)), 'E does');
  await trip(E, '1002');
  ok(linkRow(E).patreon === '1002' && one('SELECT COUNT(*) AS n FROM patreon_links WHERE patreon = ?', '918273645501').n === 0, 'linking a different Patreon replaces E\'s');
}

section('unlinking, and the flag by hand beside the link');
{
  const Ed = E;
  let r = await Ed.call('POST', '/api/patreon', { op: 'unlink' }, { origin: 'https://evil.example' });
  ok(r.status === 403 && linkRow(E), 'an unlink from another site: refused');
  r = await Ed.call('POST', '/api/patreon', 'op=unlink', { 'content-type': 'application/x-www-form-urlencoded' });
  ok(r.status === 415 && linkRow(E), 'a form post: refused');
  ok((await Ed.call('POST', '/api/patreon', { op: 'nope' })).status === 400, 'only unlink');
  r = await Ed.call('POST', '/api/patreon', { op: 'unlink' });
  ok(r.status === 200 && !r.d.linked && !linkRow(E) && !ownsAll(await looks(Ed)), 'unlinked: the link and the looks gone', r.d);
  sql("UPDATE accounts SET perks = '[\"supporter\"]' WHERE id = ?", E.id);
  const s = await status(Ed);
  ok(!s.d.linked && s.d.flagged && ownsAll(await looks(Ed)), 'a flag given by hand opens them without a link, and the status says it is by hand', s.d);
}

section('the daily sweep and a deleted account leave nothing behind');
{
  const F = await signUp('Patron_F');
  await trip(F, patron('3001', ACTIVE()));
  await F.raw('GET', '/api/patreon/link');                  // a trip left open
  ok(linkRow(F) && one('SELECT COUNT(*) AS n FROM patreon_states WHERE account = ?', F.id).n === 1, 'F: linked, with a trip open');
  const G = await signUp('Patron_G');
  await G.raw('GET', '/api/patreon/link');
  sql('UPDATE patreon_states SET expires = ? WHERE account = ?', Date.now() - 1, G.id);
  await pruneAuth(env);
  ok(one('SELECT COUNT(*) AS n FROM patreon_states WHERE account = ?', G.id).n === 0
     && one('SELECT COUNT(*) AS n FROM patreon_states WHERE account = ?', F.id).n === 1, 'the sweep takes lapsed trips and leaves live ones');
  const r = await F.call('POST', '/api/account', { op: 'delete', pass: 'correct horse Patron_F' });
  ok(r.status === 200, 'F deleted', r);
  ok(!one('SELECT 1 AS x FROM patreon_links WHERE account = ?', F.id) && !one('SELECT 1 AS x FROM patreon_states WHERE account = ?', F.id),
     'its link and its trip went with it');
  ok((await hook('members:pledge:create', '3001', { patron_status: 'active_patron', currently_entitled_amount_cents: 100 })).d.linked === false,
     'and Patreon\'s next word about that user finds nobody');
}

section('the Worker only ever talked to Patreon');
ok(PAT.calls.every(c => c.url.startsWith('https://www.patreon.com/')), 'every outside call went to www.patreon.com');

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
