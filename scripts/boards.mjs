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
const { STORE, ARCHIVE, seasonOf } = await import('../src/season.js');

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

section('the PvP ladder and players\' profiles');
{
  const d = device('10.0.0.10');
  const acct = n => one(`SELECT id FROM accounts WHERE name = '${n}'`).id;
  // before the PvP Worker has made its tables: an empty ladder, and profiles with no PvP
  const e = await d.get('board=pvp');
  ok(e.status === 200 && e.d.board === 'pvp:' + SEASON && e.d.total === 0 && e.d.rows.length === 0, 'no PvP tables yet: an empty ladder, not an error', e.d);
  const p0 = await d.get('user=ace_one');
  ok(p0.status === 200 && p0.d.pvp.ladder === null && p0.d.pvp.played === 0 && p0.d.pvp.recent.length === 0, 'and a profile with no PvP in it', p0.d.pvp);

  // the PvP Worker's tables, with a season under way: two placed, one still being placed, a few matches
  const { ensurePvp } = await import('../pvp/src/records.js');
  await ensurePvp(DB);
  const reg = await device('10.0.0.11').req('POST', '/api/account', { op: 'register', name: 'PvpOnly', pass: 'only the arena', pid: pid(4242) });
  ok(reg.status === 201, 'an account that has only ever played PvP');
  const now = Date.now();
  const rate = (n, rating, games, wins, league) => DB.sql.prepare(
    `INSERT INTO pvp_ratings (account, queue, season, rating, rd, vol, games, wins, losses, league, updated)
     VALUES (?, 'ranked', ?, ?, 80, 0.06, ?, ?, ?, ?, ?)`).run(acct(n), SEASON, rating, games, wins, games - wins, league, now);
  rate('ace_one', 1600.4, 6, 4, 'gold');
  rate('pvponly', 1310, 5, 3, 'silver');
  rate('rookie_acct', 1450, 2, 1, null);
  const match = (id, a, b, winner, sa, sb, verdict, queue, ended) => DB.sql.prepare(
    `INSERT INTO pvp_matches (id, queue, league, rated, a, b, a_pilot, b_pilot, winner, score_a, score_b, best_of, verdict, reason, started, ended, season)
     VALUES (?, ?, ?, ?, ?, ?, 'hacker', 'ember', ?, ?, ?, 3, ?, NULL, ?, ?, ?)`)
    .run(id, queue, queue === 'ranked' ? 'gold' : null, queue === 'ranked' ? 1 : 0, acct(a), acct(b), winner, sa, sb, verdict, ended - 1, ended, SEASON);
  match('a'.repeat(32), 'ace_one', 'pvponly', 0, 2, 1, 'played', 'ranked', now - 3000);
  match('b'.repeat(32), 'pvponly', 'ace_one', null, null, null, 'void', 'casual', now - 2000);
  match('c'.repeat(32), 'pvponly', 'ace_one', 0, null, null, 'forfeit', 'friend', now - 1000);
  // ACE flew to second place in a past season, on the profile its account was made with
  await getStore(env, STORE).setJSON(ARCHIVE, { list: { '2026-08': { top3: [
    { rank: 1, name: 'SOMEONE', score: 9000, pid: pid(31337) }, { rank: 2, name: 'ACE', score: 8000, pid: pid(42) }], closedAt: 1 } } });
  DB.sql.prepare("INSERT OR REPLACE INTO saves (account, rev, data, unlocks, updated) VALUES (?, 1, '{}', ?, ?)")
    .run(acct('ace_one'), JSON.stringify({ chars: ['hacker'], awake: ['hacker', 'melee'], chal: [], ups: [] }), now);

  // the ladder
  const l = await d.get('board=pvp');
  ok(l.d.total === 2 && l.d.rows.length === 2, 'the ladder holds the placed only', l.d);
  const [r1, r2] = l.d.rows;
  ok(r1.rank === 1 && r1.name === 'Ace_One' && r1.user === 'ace_one' && r1.league === 'gold' && r1.rating === 1600 && r1.wins === 4 && r1.losses === 2
     && r2.rank === 2 && r2.user === 'pvponly' && r2.league === 'silver', 'best rating first, with league, rating, wins and losses', l.d.rows);
  ok(l.d.leagues.gold === 1 && l.d.leagues.silver === 1 && !l.d.leagues.bronze, 'and how many in each league', l.d.leagues);
  ok(!leaks(l.d), 'no ids on the ladder');
  ok((await d.get('board=pvp&id=2020-01')).d.total === 0, 'a past season nobody played is empty');

  // a profile
  const p = await d.get('user=Ace_One');
  ok(p.status === 200 && p.d.user.display === 'Ace_One' && p.d.user.name === 'ace_one' && p.d.user.joined > 0, 'found by account name, any case', p.d.user);
  ok(p.d.game.boards.all && p.d.game.boards.all.score === 4000 && p.d.game.callsign === 'ACE RENAMED', 'where it stands on the game\'s boards, and the callsign it flies', p.d.game);
  const pl = Object.fromEntries(p.d.game.pilots.map(x => [x.id, x]));
  ok(pl.runner.owned && pl.ember.owned && pl.hacker.owned && pl.hacker.awake && !pl.melee.owned && !pl.melee.awake && !pl.ember.awake && pl.hacker.name === 'THE HACKER',
     'its hangar: the base pilots, what its save has unlocked and awakened (never a pilot it does not own)', p.d.game.pilots);
  ok(p.d.game.podiums.length === 1 && p.d.game.podiums[0].season === '2026-08' && p.d.game.podiums[0].rank === 2 && p.d.game.podiums[0].score === 8000,
     'its season podiums, from the profiles its account owns', p.d.game.podiums);
  const v = p.d.pvp;
  ok(v.ladder && v.ladder.rank === 1 && v.ladder.of === 2 && v.ladder.league === 'gold' && v.ladder.rating === 1600, 'its place on the ladder', v.ladder);
  ok(v.played === 2 && v.wins === 1 && v.losses === 1, 'its record: a no contest counts for nobody', v);
  ok(v.recent.length === 3 && v.recent[0].queue === 'friend' && v.recent[0].won === false && v.recent[0].verdict === 'forfeit'
     && v.recent[1].won === null && v.recent[2].won === true && v.recent[2].score.join() === '2,1' && v.recent[2].pilot === 'hacker'
     && v.recent[2].them.name === 'PvpOnly' && v.recent[2].them.user === 'pvponly' && v.recent[2].them.pilot === 'ember',
     'its latest matches, newest first, each from its own side', v.recent);
  ok(!leaks(p.d), 'no account, profile or match id anywhere in it');
  const placing = await d.get('user=rookie_acct');
  ok(placing.d.pvp.ladder && placing.d.pvp.ladder.placing === true && placing.d.pvp.ladder.left === 3, 'a player still being placed, and how many to go', placing.d.pvp.ladder);
  ok((await d.get('user=straggler')).status === 404, 'a guest\'s callsign has no profile');
  ok((await d.get('user=nobody_here')).status === 404 && (await d.get('user=no%20way!')).status === 404, 'nor does a name nobody has');

  // the boards and search lead to it
  const all = await d.get('board=all');
  ok(all.d.rows.some(x => x.user === 'ace_one') && all.d.rows.some(x => x.user === null && !x.account), 'an account\'s row carries its name for the link; a guest\'s does not');
  const s = await d.get('q=ace_');
  ok(s.d.players[0].user === 'ace_one' && s.d.players[0].pvp && s.d.players[0].pvp.rank === 1, 'search: the account, and its place on the ladder', s.d.players[0]);
  const only = await d.get('q=pvpon');
  ok(only.d.players.length === 1 && only.d.players[0].user === 'pvponly' && only.d.players[0].pvp.league === 'silver'
     && Object.keys(only.d.players[0].boards).length === 0, 'an account with no runs is found too, for the ladder and its profile', only.d.players);
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
