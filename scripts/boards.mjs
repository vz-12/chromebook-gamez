/* ===========================================================================
   THE BOARDS TEST — `npm run test:boards`.

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), the
   way scripts/account.mjs runs it. It files runs through /api/leaderboard
   exactly as the game does, folds in board documents as they were before
   this existed, and reads everything back through /api/boards: ranks and
   ties, pages past the top 100, search, a player's own placement, accounts
   and the guest rows they take over, and the daily's first-run rule.
   ========================================================================= */
import { makeD1 } from './lib/d1-sqlite.mjs';

const worker = (await import('../src/index.js')).default;
const { foldBoards } = await import('../src/boards.js');
const { getStore } = await import('../src/store.js');
const { STORE, seasonOf } = await import('../src/season.js');

const DB = makeD1();
const env = { DB, ASSETS: { fetch: () => new Response('asset') } };
const SEASON = seasonOf(), TODAY = new Date().toISOString().slice(0, 10);

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const one = q => DB.sql.prepare(q).get();
const count = (where = '1=1') => one(`SELECT COUNT(*) AS n FROM scores WHERE ${where}`).n;

function device(ip) {
  const d = { cookie: '', ip };
  d.req = async (method, path, body) => {
    const headers = { 'cf-connecting-ip': ip, origin: 'https://voidrunner.online' };
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request('https://voidrunner.online' + path,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    let data = null;
    try { data = await res.json(); } catch (e) {}
    return { status: res.status, d: data };
  };
  // a run, the way Board.submit and Daily.submit file one
  d.run = (name, pid, score, extra = {}) => d.req('POST', '/api/leaderboard', Object.assign(
    { pid, name, score, wave: 10, sector: 'S', loop: 0, level: 9, kills: 100, time: 300 }, extra));
  d.get = qs => d.req('GET', '/api/boards?' + qs);
  return d;
}
const pid = n => n.toString(16).padStart(32, '0');
const leaks = body => /"pid"|[0-9a-f]{32}/.test(JSON.stringify(body));

/* ---------------------------------------------------------------------- */
section('the boards as they were: documents folded into rows');
{
  // 101 rows on the season: a tie at the top, and one row the top 100 never kept
  const store = getStore(env, STORE);
  const entries = [];
  for (let i = 0; i < 100; i++)
    entries.push({ name: 'P' + i, score: 100000 - i * 100, wave: 9, sector: 'X', loop: 0, level: 5,
                   kills: 50, time: 200, at: 1000 + i, pid: pid(1000 + i) });
  entries[1].score = entries[0].score;          // P0 and P1 tie for first
  await store.setJSON('season:' + SEASON, { entries, updated: Date.now() });
  await store.setJSON('top', { entries: entries.slice(0, 10), updated: Date.now() });
  await store.setJSON('day:' + TODAY, { entries: [{ name: 'EARLY', score: 500, at: 5, pid: pid(7) }], updated: Date.now() });
  const r = await device('10.0.0.1').get('board=season');
  ok(r.status === 200 && r.d.total === 100 && r.d.rows.length === 50, 'the first page of the season', r.d && r.d.total);
  ok(r.d.rows[0].rank === 1 && r.d.rows[1].rank === 1 && r.d.rows[2].rank === 3, 'a tie shares a rank, the next skips', r.d.rows.slice(0, 3));
  ok(r.d.board === 'season:' + SEASON && r.d.season === SEASON && r.d.day === TODAY, 'which board, and the calendar');
  ok(!leaks(r.d), 'no profile id or account id in the reply');
  const all = await device('10.0.0.1').get('board=all');
  ok(all.d.total === 10, 'all-time folded too', all.d.total);
  const day = await device('10.0.0.1').get('board=day');
  ok(day.d.total === 1 && day.d.rows[0].name === 'EARLY', 'and today', day.d);
}

section('pages and ranks past the top 100');
{
  const g = device('10.0.0.2');
  const r = await g.run('STRAGGLER', pid(5000), 50);
  ok(r.status === 200 && r.d.ok, 'a low run is filed', r);
  const p = await g.get('board=season&from=50&n=60');
  ok(p.d.rows.length === 51 && p.d.from === 50 && p.d.total === 101, 'the second page holds the rest', { n: p.d.rows.length, total: p.d.total });
  ok(p.d.rows[0].rank === 51 && p.d.rows[50].rank === 101 && p.d.rows[50].name === 'STRAGGLER',
     'ranks carry on across the page, to the 101st', [p.d.rows[0].rank, p.d.rows[50]]);
  const s = await g.get('q=strag');
  const me = s.d.players[0];
  ok(s.d.players.length === 1 && me.name === 'STRAGGLER', 'found by the start of the callsign', s.d);
  ok(me && me.boards['season:' + SEASON].rank === 101 && me.boards['season:' + SEASON].of === 101, 'with its placement: 101 of 101', me);
  ok(me && me.boards.all && me.boards['day:' + TODAY] === undefined, 'on all-time too, and not on a day it never flew');
  const doc = await getStore(env, STORE).get('season:' + SEASON, { type: 'json' });
  ok(doc.entries.length === 100 && !doc.entries.some(e => e.name === 'STRAGGLER'), 'the game\'s own top-100 document is unchanged');
  const better = await g.run('STRAGGLER', pid(5000), 40);
  ok(better.status === 200 && one(`SELECT score FROM scores WHERE who = 'n:STRAGGLER' AND board = 'all'`).score === 50, 'a worse run does not replace a better one');
}

section('signed in: one row per account, whatever the callsign');
const A = device('10.0.0.3');
{
  const reg = await A.req('POST', '/api/account', { op: 'register', name: 'Ace_One', pass: 'flight deck 1', pid: pid(42) });
  ok(reg.status === 201, 'an account', reg.status);
  await A.run('ACE', pid(42), 3000);
  await A.run('ACE RENAMED', pid(42), 4000);
  ok(count("who LIKE 'a:%' AND board = 'all'") === 1, 'two callsigns, one row');
  const r = await A.get('q=ace_');
  const p = r.d.players[0];
  ok(r.d.players.length === 1 && p.account === 'Ace_One' && p.name === 'ACE RENAMED', 'found by account name, under its latest best', r.d.players);
  const byCall = await A.get('q=ace re');
  ok(byCall.d.players.length === 1 && byCall.d.players[0].account === 'Ace_One', 'and by callsign');
  ok(!leaks(r.d), 'still no ids in the reply');
  const page = await A.get('board=all');
  ok(page.d.rows.some(x => x.name === 'ACE RENAMED' && x.account === 'Ace_One'), 'the board marks the row as an account\'s');
}

section('a guest who signs in brings their rows along');
{
  const G = device('10.0.0.4');
  await G.run('ROOKIE', pid(77), 9000);                          // as a guest
  ok(count("who = 'n:ROOKIE'") === 2, 'guest rows on season and all-time');
  const reg = await G.req('POST', '/api/account', { op: 'register', name: 'rookie_acct', pass: 'first time 7', pid: pid(77) });
  ok(reg.status === 201, 'then makes an account on the same profile');
  await G.run('ROOKIE', pid(77), 100);                           // a weak run, signed in
  ok(count("who = 'n:ROOKIE'") === 0, 'the guest rows are gone');
  const id = one("SELECT id FROM accounts WHERE name = 'rookie_acct'").id;
  ok(one(`SELECT score FROM scores WHERE who = 'a:${id}' AND board = 'all'`).score === 9000, 'and the account row kept the better run');
  // a document entry from a linked profile is filed under the account directly
  await getStore(env, STORE).setJSON('top', { entries: [{ name: 'ROOKIE', score: 9500, at: 9, pid: pid(77) }], updated: Date.now() });
  await foldBoards(env);
  ok(count("who = 'n:ROOKIE'") === 0 && one(`SELECT score FROM scores WHERE who = 'a:${id}' AND board = 'all'`).score === 9500,
     'folding a linked profile\'s entry goes straight to the account');
}

section('the daily keeps the first run');
{
  const D = device('10.0.0.5');
  const a = await D.run('DAILYONE', pid(88), 700, { day: TODAY });
  const b = await D.run('DAILYONE', pid(88), 9999, { day: TODAY });
  ok(a.status === 200 && b.status === 200, 'both filed', [a.status, b.status]);
  ok(one(`SELECT score FROM scores WHERE who = 'n:DAILYONE' AND board = 'day:${TODAY}'`).score === 700, 'the first stands');
  ok(count("who = 'n:DAILYONE' AND board != 'day:" + TODAY + "'") === 0, 'a daily touches no other board');
  await getStore(env, STORE).setJSON('day:' + TODAY, { entries: [{ name: 'DAILYONE', score: 1, at: 1, pid: pid(88) }], updated: Date.now() });
  await foldBoards(env);
  ok(one(`SELECT score FROM scores WHERE who = 'n:DAILYONE' AND board = 'day:${TODAY}'`).score === 1, 'an earlier one found later takes its place');
}

section('a replay from an old season goes to all-time only');
{
  const R = device('10.0.0.6');
  await R.run('REPLAYER', pid(99), 1234, { backfill: 1, forSeason: '2020-01' });
  ok(count("who = 'n:REPLAYER' AND board = 'all'") === 1 && count("who = 'n:REPLAYER' AND board LIKE 'season:%'") === 0, 'all-time, not the season');
}

section('me');
{
  const g = await device('10.0.0.7').req('POST', '/api/boards', { op: 'me', pid: pid(5000) });
  ok(g.status === 200 && !g.d.signedIn && g.d.players.length === 1 && g.d.players[0].name === 'STRAGGLER', 'a guest, by this device\'s profile', g.d);
  const a = await A.req('POST', '/api/boards', { op: 'me', pid: pid(1) });
  ok(a.d.signedIn && a.d.players.length === 1 && a.d.players[0].account === 'Ace_One', 'signed in: the account, whatever profile is sent', a.d);
  const none = await device('10.0.0.8').req('POST', '/api/boards', { op: 'me', pid: pid(123456) });
  ok(none.d.players.length === 0, 'a profile with no runs has no rows');
  const evil = await worker.fetch(new Request('https://voidrunner.online/api/boards', { method: 'POST',
    headers: { origin: 'https://evil.example', 'content-type': 'application/json' }, body: '{"op":"me"}' }), env);
  ok(evil.status === 403, 'another site cannot ask', evil.status);
  const which = await device('10.0.0.7').req('POST', '/api/boards', { op: 'me', pid: pid(5000), boards: ['all', 'nonsense'] });
  ok(JSON.stringify(which.d.boards) === '["all"]', 'only real boards are asked about', which.d.boards);
}

section('the rest');
{
  const d = device('10.0.0.9');
  const l = await d.get('list=1');
  ok(l.status === 200 && l.d.seasons[0] === SEASON, 'the season list starts with this one', l.d);
  ok((await d.get('board=nonsense')).status === 400, 'an unknown board');
  ok((await d.get('q=')).status === 400, 'an empty search');
  const past = await d.get('board=day&id=2001-01-01');
  ok(past.status === 200 && past.d.total === 0 && past.d.rows.length === 0, 'a day nobody flew is empty, not an error');
  const big = await d.get('board=season&n=5000');
  ok(big.d.rows.length === 100, 'a page is at most 100 rows', big.d.rows.length);
  // the fold reads only documents written since the last one
  DB.sql.prepare("UPDATE scores_meta SET v = ? WHERE k = 'folded'").run(Date.now() + 1000);
  const quiet = await foldBoards(env);
  ok(quiet.docs === 0, 'nothing changed, nothing read', quiet);
  // the 15-minute cron folds after the Netlify sync (which has no config here)
  await new Promise(r => setTimeout(r, 1100));
  await getStore(env, STORE).setJSON('top', { entries: [{ name: 'CRONNED', score: 77, at: 3 }], updated: Date.now() });
  const pending = [];
  await worker.scheduled({ cron: '*/15 * * * *' }, env, { waitUntil: p => pending.push(p) });
  await Promise.allSettled(pending);
  ok(count("who = 'n:CRONNED'") === 1, 'the cron folds', count("who = 'n:CRONNED'"));
}

console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
