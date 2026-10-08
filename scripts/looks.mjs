/* ===========================================================================
   THE LOOKS TEST — `npm run test:looks` (PVP-PLAN.md, Phase 7 part 1)

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), the
   way scripts/account.mjs and scripts/boards.mjs run it. Accounts are made
   and saved through /api/account, PvP's season rewards are filed straight
   into its tables, and everything about a profile's look is asked of
   /api/account/look and /api/boards?user=: the defaults, every gate opening
   on what the account has done, grants given and taken back, picks saved
   only when owned, and what a profile shows to anybody.
   ========================================================================= */
import { makeD1 } from './lib/d1-sqlite.mjs';

const worker = (await import('../src/index.js')).default;
const { getStore } = await import('../src/store.js');
const { STORE, ARCHIVE } = await import('../src/season.js');
const { LOOKS, KINDS, MAX_DECALS } = await import('../src/looks.js');
const { flagSql, readSql } = await import('./supporter.mjs');

const DB = makeD1();
const env = { DB, ASSETS: { fetch: () => new Response('asset') } };

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const sql = (q, ...p) => DB.sql.prepare(q).run(...p);
const one = (q, ...p) => DB.sql.prepare(q).get(...p);

let ipN = 0;
function device(origin = 'https://voidrunner.online') {
  const d = { cookie: '', ip: '10.0.0.' + (++ipN) };
  d.call = async (method, path, body, extra = {}) => {
    const headers = Object.assign({ 'cf-connecting-ip': d.ip }, origin ? { origin } : {}, extra);
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined && !headers['content-type']) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request('https://voidrunner.online' + path,
      { method, headers, body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, d: data };
  };
  return d;
}
async function signUp(name, pid) {
  const d = device();
  const r = await d.call('POST', '/api/account', { op: 'register', name, pass: 'correct horse ' + name, pid });
  if (r.status !== 201) throw new Error('register ' + name + ': ' + r.status + ' ' + JSON.stringify(r.d));
  d.id = one('SELECT id FROM accounts WHERE name = ?', name.toLowerCase()).id;
  return d;
}
let rev = {};
async function save(d, data, unlocks) {
  const r = await d.call('PUT', '/api/account/save', { rev: rev[d.id] || 0, save: data, unlocks });
  if (r.status !== 200) throw new Error('save: ' + r.status + ' ' + JSON.stringify(r.d));
  rev[d.id] = r.d.rev;
}
const look = d => d.call('GET', '/api/account/look');
const wear = (d, b) => d.call('PUT', '/api/account/look', b);
const item = (L, kind, id) => L.d.items[kind].find(i => i.id === id);
const profile = name => device(null).call('GET', '/api/boards?user=' + name);
const grant = (d, it, why = '') => sql('INSERT OR REPLACE INTO look_grants (account, item, why, at) VALUES (?, ?, ?, ?)', d.id, it, why, Date.now());
const pid = n => n.toString(16).padStart(32, '0');

/* ---------------------------------------------------------------------- */
section('the catalog: every item named once, every gate one the server knows');
{
  for (const k of KINDS) {
    const ids = LOOKS[k].map(i => i.id);
    ok(new Set(ids).size === ids.length, k + ': ids are unique', ids);
    ok(LOOKS[k].every(i => /^[a-z0-9-]+$/.test(i.id) && typeof i.n === 'string' && i.n), k + ': ids and names are well formed');
    ok(LOOKS[k].every(i => /^(free|grant|podium|pvp-podium|supporter|pilot:\w+|awake:\w+|runs:\d+|pvp-league:\w+)$/.test(i.gate)), k + ': every gate is in the language', LOOKS[k].map(i => i.gate));
  }
  ok(LOOKS.banner.some(i => i.id === 'world' && i.gate === 'free') && LOOKS.picture.some(i => i.id === 'sigil' && i.gate === 'free'), 'the defaults are free');
}

section('signed out: nothing to ask, nothing to save');
{
  const g = device();
  ok((await look(g)).status === 401, 'GET answers 401');
  ok((await wear(g, { banner: 'world' })).status === 401, 'PUT answers 401');
}

section('a new account: the defaults, and what is open to it from the start');
const A = await signUp('Nova_Ace', pid(1));
{
  const L = await look(A);
  ok(L.status === 200 && L.d.account === 'nova_ace', 'its own look, by its name', L);
  ok(JSON.stringify(L.d.look) === JSON.stringify({ banner: 'world', picture: 'sigil', decals: [] }), 'the defaults', L.d.look);
  ok(L.d.maxDecals === MAX_DECALS, 'it is told how many decals a profile shows');
  ok(item(L, 'banner', 'world').owned && item(L, 'picture', 'sigil').owned, 'the free ones are its own');
  ok(item(L, 'banner', 'runner').owned && item(L, 'banner', 'ember').owned, 'the base pilots\' banners are open to every account');
  ok(!item(L, 'banner', 'hacker').owned && item(L, 'banner', 'hacker').lock === 'UNLOCK THE HACKER', 'a pilot it lacks is locked, and says how to open it', item(L, 'banner', 'hacker'));
  ok(!item(L, 'decal', 'founder').owned && item(L, 'decal', 'founder').lock === 'GIVEN BY THE TEAM', 'a granted-only decal is locked to it');
  ok(item(L, 'decal', 'veteran').lock === 'FLY 100 RUNS · 0 SO FAR', 'a runs gate counts what is flown', item(L, 'decal', 'veteran'));
  ok(!item(L, 'picture', 'bronze').owned, 'a league crest is locked before any PvP season');
  const P = await profile('nova_ace');
  ok(P.status === 200 && JSON.stringify(P.d.look) === JSON.stringify({ banner: 'world', picture: 'sigil', decals: [] }), 'its profile wears the defaults', P.d && P.d.look);
}

section('picks are saved only when owned');
{
  let r = await wear(A, { banner: 'ember', picture: 'runner' });
  ok(r.status === 200 && r.d.look.banner === 'ember' && r.d.look.picture === 'runner', 'an owned banner and picture', r);
  r = await wear(A, { banner: 'ronin' });
  ok(r.status === 403 && JSON.stringify(r.d.items) === '["banner:ronin"]', 'a locked one is refused and named', r);
  ok((await look(A)).d.look.banner === 'ember', 'and the refusal changed nothing');
  ok((await wear(A, { banner: 'nope' })).status === 400, 'an id that is not in the catalog is refused');
  ok((await wear(A, { picture: 'world' })).status === 400, 'a banner\'s id is no picture');
  ok((await wear(A, { decals: 'founder' })).status === 400, 'decals must be a list');
  ok((await wear(A, { decals: ['awakened', 'awakened'] })).status === 400, 'a decal picked twice is refused');
  ok((await wear(A, { decals: ['a', 'b', 'c', 'd', 'e'] })).status === 400, 'more than the profile shows is refused');
  ok((await wear(A, { decals: ['founder'] })).status === 403, 'a decal it was never given is refused');
  ok((await A.call('PUT', '/api/account/look', { banner: 'world' }, { origin: 'https://evil.example' })).status === 403, 'a write from another site is refused');
  ok((await A.call('PUT', '/api/account/look', 'banner=world', { 'content-type': 'application/x-www-form-urlencoded' })).status === 415, 'a form post is refused');
  ok((await A.call('PUT', '/api/account/look', '{"banner":"' + 'x'.repeat(3000) + '"}')).status === 413, 'an oversized body is refused');
  ok((await A.call('POST', '/api/account/look', {})).status === 405, 'only GET and PUT');
  const P = await profile('nova_ace');
  ok(P.d.look.banner === 'ember' && P.d.look.picture === 'runner', 'the profile wears the picks', P.d.look);
}

section('gates open on what the account has done');
{
  await save(A, { runs: 120, best: 5000 }, { chars: ['runner', 'ember', 'hacker', 'melee'], awake: ['melee', 'nonsense'] });
  const L = await look(A);
  ok(item(L, 'banner', 'hacker').owned && item(L, 'picture', 'vagrant').owned, 'pilots unlocked in the save open their looks');
  ok(item(L, 'banner', 'ronin').owned && item(L, 'picture', 'ronin').owned, 'an awakened pilot opens its awakened looks');
  ok(!item(L, 'banner', 'superuser').owned && item(L, 'banner', 'superuser').lock === 'AWAKEN THE HACKER', 'one not awakened stays locked', item(L, 'banner', 'superuser'));
  ok(item(L, 'decal', 'awakened').owned && item(L, 'decal', 'awakened').why === 'A PILOT AWAKENED', 'awake:any opens with one awakened pilot, and says why', item(L, 'decal', 'awakened'));
  ok(item(L, 'decal', 'veteran').owned && item(L, 'decal', 'veteran').why === '100 RUNS FLOWN', 'runs: the save\'s run count', item(L, 'decal', 'veteran'));
  ok(!item(L, 'banner', 'crown').owned, 'no season podium yet');
  const B = await signUp('qa_two', pid(2));
  await save(B, { runs: 3 }, { chars: [], awake: ['melee'] });
  const LB = await look(B);
  ok(!item(LB, 'banner', 'ronin').owned, 'awake without the pilot unlocked opens nothing (the save\'s word is checked against itself)');
  ok(item(LB, 'decal', 'veteran').lock === 'FLY 100 RUNS · 3 SO FAR', 'and the count says how far along it is');

  // a season podium on the game's boards: filed with the profile ids that flew it
  const store = getStore(env, STORE);
  await store.setJSON(ARCHIVE, { list: { '2026-09': { top3: [{ rank: 2, name: 'NOVA', score: 99999, pid: pid(1) }] } } });
  const L2 = await look(A);
  ok(item(L2, 'banner', 'crown').owned && item(L2, 'decal', 'crown').owned, 'a podium on the game\'s boards opens the crown');
  ok(!item(await look(B), 'banner', 'crown').owned, 'and only for the account whose profile stood on it');
}

section('PvP: league badges and podiums, from the tables the PvP Worker files');
{
  sql('CREATE TABLE IF NOT EXISTS pvp_badges (season TEXT, queue TEXT, account TEXT, league TEXT, rating REAL, PRIMARY KEY (season, queue, account))');
  sql('CREATE TABLE IF NOT EXISTS pvp_podiums (season TEXT, queue TEXT, rank INTEGER, account TEXT, rating REAL, league TEXT, PRIMARY KEY (season, queue, rank))');
  sql("INSERT INTO pvp_badges VALUES ('2026-09', 'ranked', ?, 'gold', 1550)", A.id);
  let L = await look(A);
  ok(item(L, 'picture', 'bronze').owned && item(L, 'picture', 'silver').owned && item(L, 'picture', 'gold').owned, 'a gold finish opens gold and every league under it');
  ok(!item(L, 'picture', 'platinum').owned && item(L, 'picture', 'platinum').lock === 'FINISH A PVP SEASON IN PLATINUM OR HIGHER', 'and not the ones above', item(L, 'picture', 'platinum'));
  ok(item(L, 'picture', 'void').lock === 'FINISH A PVP SEASON IN VOID', 'the top league says so plainly');
  ok(item(L, 'banner', 'ladder').owned, 'THE LADDER opens at gold');
  ok(!item(L, 'decal', 'duelist').owned, 'no PvP podium yet');
  sql("INSERT INTO pvp_podiums VALUES ('2026-09', 'ranked', 3, ?, 2050, 'platinum')", A.id);
  L = await look(A);
  ok(item(L, 'decal', 'duelist').owned, 'a PvP podium opens the duelist decal');
}

section('grants: given by hand, whatever the gate, and taken back');
{
  let r = await wear(A, { decals: ['founder'] });
  ok(r.status === 403, 'not before it is given');
  grant(A, 'decal:founder', 'PLAYED IN THE FIRST WEEK');
  grant(A, 'banner:superuser', 'A GIFT');
  const L = await look(A);
  ok(item(L, 'decal', 'founder').owned && item(L, 'decal', 'founder').why === 'PLAYED IN THE FIRST WEEK', 'a granted decal is its own, with its why', item(L, 'decal', 'founder'));
  ok(item(L, 'banner', 'superuser').owned && item(L, 'banner', 'superuser').why === 'A GIFT', 'a grant opens an item whose gate is shut');
  r = await wear(A, { banner: 'superuser', picture: 'ronin', decals: ['founder', 'veteran', 'awakened', 'duelist'] });
  ok(r.status === 200 && r.d.look.decals.length === MAX_DECALS, 'a full row of decals, in the order picked', r);
  let P = await profile('nova_ace');
  ok(P.d.look.banner === 'superuser' && P.d.look.picture === 'ronin', 'the profile wears them', P.d.look);
  ok(JSON.stringify(P.d.look.decals.map(x => x.id)) === '["founder","veteran","awakened","duelist"]', 'its decals in order', P.d.look.decals);
  ok(P.d.look.decals[0].n === 'FOUNDER' && P.d.look.decals[0].why === 'PLAYED IN THE FIRST WEEK' && P.d.look.decals[1].why === '100 RUNS FLOWN',
     'each with its name and why', P.d.look.decals);
  // taken back: off the profile on its next view, the default in its place
  sql("DELETE FROM look_grants WHERE account = ? AND item IN ('decal:founder', 'banner:superuser')", A.id);
  P = await profile('nova_ace');
  ok(P.d.look.banner === 'world', 'a banner taken back shows the default', P.d.look);
  ok(JSON.stringify(P.d.look.decals.map(x => x.id)) === '["veteran","awakened","duelist"]', 'a decal taken back leaves the row', P.d.look.decals);
  ok((await look(A)).d.look.banner === 'world', 'and its owner sees the same');
}

section('a dev account owns everything');
{
  const D = await signUp('dev_one', pid(9));
  sql("UPDATE accounts SET perks = '[\"dev\"]' WHERE id = ?", D.id);
  const L = await look(D);
  ok(KINDS.every(k => L.d.items[k].every(i => i.owned)), 'every item, every kind');
  const r = await wear(D, { banner: 'crown', picture: 'void', decals: ['developer', 'champion'] });
  ok(r.status === 200, 'and may wear any of it', r);
  ok((await profile('dev_one')).d.look.picture === 'void', 'on its profile');
}

section('the supporter flag: `npm run supporter`\'s own SQL opens the SUPPORTER looks, and takes them back');
{
  const S = await signUp('Sup_One', pid(11));
  const perksOf = name => JSON.parse(DB.sql.prepare(readSql(name)).get().perks);
  const SUP = [['banner', 'supporter'], ['picture', 'supporter'], ['decal', 'supporter']];
  ok(SUP.every(([k, id]) => LOOKS[k].some(i => i.id === id && i.gate === 'supporter')), 'a SUPPORTER banner, picture and decal, behind the flag');
  let L = await look(S);
  ok(SUP.every(([k, id]) => !item(L, k, id).owned && item(L, k, id).lock === 'SUPPORT VOIDRUNNER ON PATREON'), 'locked, and they say how to open them', SUP.map(([k, id]) => item(L, k, id)));
  ok((await wear(S, { decals: ['supporter'] })).status === 403, 'not worn before the flag');

  sql("UPDATE accounts SET perks = '[\"skin:laurel\"]' WHERE id = ?", S.id);
  ok(sql(flagSql('SUP_ONE')).changes === 1, 'flagged, by any spelling of the name');
  ok(JSON.stringify(perksOf('sup_one')) === '["skin:laurel","supporter"]', 'added to the perks, the rest kept', perksOf('sup_one'));
  ok(sql(flagSql('sup_one')).changes === 0 && perksOf('sup_one').length === 2, 'flagging again changes nothing');
  L = await look(S);
  ok(SUP.every(([k, id]) => item(L, k, id).owned && item(L, k, id).why === 'A PATREON SUPPORTER'), 'all three open at once, and say why', SUP.map(([k, id]) => item(L, k, id)));
  ok(!item(L, 'decal', 'founder').owned && !item(L, 'banner', 'hacker').owned, 'and nothing else opens with them');
  ok(!item(await look(A), 'decal', 'supporter').owned, 'only for the flagged account');
  const r = await wear(S, { banner: 'supporter', picture: 'supporter', decals: ['supporter'] });
  ok(r.status === 200, 'worn', r);
  let P = await profile('sup_one');
  ok(P.d.look.banner === 'supporter' && P.d.look.picture === 'supporter', 'the profile wears them', P.d.look);
  ok(JSON.stringify(P.d.look.decals) === '[{"id":"supporter","n":"SUPPORTER","why":"A PATREON SUPPORTER"}]', 'the decal, with its name and why', P.d.look.decals);
  const aw = await S.call('GET', '/api/leaderboard?awards=' + pid(11));
  const got = (aw.d && aw.d.awards) || [];
  ok(aw.status === 200 && JSON.stringify(got.filter(a => a.perk).map(a => a.perk)) === '["supporter"]'
     && JSON.stringify(got.filter(a => a.skin).map(a => a.skin)) === '["laurel"]',
     'the game\'s awards carry the flag and nothing more (the game drops a perk it does not know)', aw);

  ok(sql(flagSql('sup_one', true)).changes === 1, 'taken back');
  ok(JSON.stringify(perksOf('sup_one')) === '["skin:laurel"]', 'only the flag leaves the perks', perksOf('sup_one'));
  ok(sql(flagSql('sup_one', true)).changes === 0, 'taking it again changes nothing');
  P = await profile('sup_one');
  ok(JSON.stringify(P.d.look) === JSON.stringify({ banner: 'world', picture: 'sigil', decals: [] }), 'off the profile on its next view, the defaults in their place', P.d.look);

  sql(flagSql('dev_one'));
  ok(JSON.stringify(perksOf('dev_one')) === '["dev","supporter"]', 'a dev account flagged keeps dev', perksOf('dev_one'));
  sql(flagSql('dev_one', true));
  ok(JSON.stringify(perksOf('dev_one')) === '["dev"]', 'and taken back, keeps dev still', perksOf('dev_one'));
  ok(sql(flagSql('nobody_here')).changes === 0, 'a name with no account changes nothing');
}

section('what a profile shows: nothing private');
{
  const P = await profile('nova_ace');
  const s = JSON.stringify(P.d.look);
  ok(!/[0-9a-f]{32}/.test(s) && !/"account"|"pid"|"at"/.test(s), 'no ids, no dates, no account in the look', P.d.look);
  ok((await profile('nobody_here')).status === 404, 'an account that is not there has no profile');
}

section('deleting the account deletes its look and its grants');
{
  const C = await signUp('gone_soon', pid(7));
  grant(C, 'decal:tester', 'QA');
  await wear(C, { decals: ['tester'] });
  ok(one('SELECT COUNT(*) AS n FROM looks WHERE account = ?', C.id).n === 1, 'it had a look');
  const r = await C.call('POST', '/api/account', { op: 'delete', pass: 'correct horse gone_soon' });
  ok(r.status === 200, 'deleted', r);
  ok(one('SELECT COUNT(*) AS n FROM looks WHERE account = ?', C.id).n === 0 && one('SELECT COUNT(*) AS n FROM look_grants WHERE account = ?', C.id).n === 0,
     'its look and its grants went with it');
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
