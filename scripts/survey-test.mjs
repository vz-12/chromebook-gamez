/* ===========================================================================
   THE SURVEYS — the test: `npm run test:survey`  (src/survey.js and
   src/survey-bank.js; SURVEYS in index.html; scripts/survey.mjs; /surveys/)

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), and
   the game booted in Node (scripts/lib/game-vm.mjs), its fetches carried to
   that same Worker:
     the bank     every question whole, and the game keeps all of it
     the route    from our own pages, as JSON; a guest by the save's id, or
                  signed in; only answers the bank knows; the run held to
                  plain values; a survey sent twice kept once; nobody named;
                  one save and one address kept to a few a day
     an admin's   the counts, split and filtered; beta builds apart; the CSV;
                  the week's count; and nobody else's
     the tool     the SQL `npm run survey` sends, run as it would be, and
                  what it prints
     the game     runs counted, and only ones worth asking about; the card
                  only on the menu, never in a run; answered with a key or a
                  click; a finished survey pays its pass at once and its
                  answers reach the Worker with the run; LATER keeps it, SKIP
                  lets it go unpaid; offline it waits; two stores merge to
                  the right passes; the run is the same run with it as without
   ========================================================================= */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeD1 } from './lib/d1-sqlite.mjs';
import { loadGame, canvasCalls } from './lib/game-vm.mjs';
import { resultsSql, report } from './lib/survey-sql.mjs';
import { SURVEY } from '../src/survey-bank.js';
import { SURVEY_SCHEMA, DIMS, CSV_HEAD, cleanCtx } from '../src/survey.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');

const worker = (await import('../src/index.js')).default;
const DB = makeD1();
const env = { DB, ASSETS: { fetch: () => new Response('asset') } };

let fails = 0, passes = 0;
function ok(cond, what, extra) {
  if (cond) { passes++; return; }
  fails++;
  console.log('  FAIL  ' + what + (extra !== undefined ? '  ' + JSON.stringify(extra).slice(0, 400) : ''));
}
const section = t => console.log('· ' + t);
const one = (q, ...p) => DB.sql.prepare(q).get(...p);
const all = (q, ...p) => DB.sql.prepare(q).all(...p);
const exec = sql => DB.sql.exec(sql);
const settle = () => new Promise(res => setTimeout(res, 20));

let ipN = 0;
function device() {
  const d = { cookie: '', ip: '10.7.0.' + (++ipN) };
  d.raw = async (method, p, body, { origin = 'https://voidrunner.online', type = 'application/json', text } = {}) => {
    const headers = { 'cf-connecting-ip': d.ip };
    if (origin) headers.origin = origin;
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined || text !== undefined) headers['content-type'] = type;
    const res = await worker.fetch(new Request('https://voidrunner.online' + p,
      { method, headers, body: text !== undefined ? text : body === undefined ? undefined : JSON.stringify(body) }), env, { waitUntil() {} });
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    return res;
  };
  d.call = async (method, p, body, o) => {
    const res = await d.raw(method, p, body, o);
    let data = null;
    try { data = await res.clone().json(); } catch (e) {}
    return { status: res.status, d: data, res };
  };
  return d;
}
async function signUp(name) {
  const d = device();
  const r = await d.call('POST', '/api/account', { op: 'register', name, pass: 'correct horse ' + name, pid: (++ipN).toString(16).padStart(32, 'a') });
  if (r.status !== 201) throw new Error('register ' + name + ': ' + r.status + ' ' + JSON.stringify(r.d));
  return d;
}
let sidN = 0;
const sid = () => (++sidN).toString(16).padStart(20, '5');
const pid = n => n.toString(16).padStart(32, '0');
const RUN = { mode: 'run', pilot: 'ember', coop: false, sector: 'THE FORGE', wave: 9, loop: 0, score: 4200, time: 392,
              level: 8, kills: 140, runs: 12, died: true, boss: 'THE FORGEHEART', chal: '', won: false, hard: false,
              device: 'mouse', ver: '2.1', beta: false };
const survey = (over = {}) => Object.assign({ sid: sid(), pid: pid(1), ctx: RUN,
  answers: [{ q: 'difficulty', a: 3 }, { q: 'boss_fair', a: 2 }, { q: 'fun', a: 4 }] }, over);

/* ---------------------------------------------------------------------- */
section('the bank: every question whole');
{
  const ids = SURVEY.questions.map(q => q.id);
  ok(new Set(ids).size === ids.length, 'every id its own', ids);
  ok(ids.every(id => /^[a-z0-9_]{1,32}$/.test(id)), 'every id a plain word');
  const R = SURVEY.rules;
  ok(R.every >= 1 && R.ask >= 1 && R.ask <= 6 && R.pay >= 1 && R.pay <= 5 && R.perDay >= 1 && R.gapMin >= 0 && R.minSecs >= 0 && R.minRuns >= 0, 'the rules in range', R);
  const KNOWN = ['mode', 'died', 'boss', 'shop', 'coop', 'minWave'];
  for (const q of SURVEY.questions) {
    ok(typeof q.t === 'string' && q.t.length <= 120 && Array.isArray(q.c) && q.c.length >= 2 && q.c.length <= 6
       && q.c.every(c => typeof c === 'string' && c && c.length <= 40), q.id + ': its words and two to six short answers', q);
    ok(!q.when || Object.keys(q.when).every(k => KNOWN.includes(k)), q.id + ': only conditions the game knows', q.when);
    ok(!q.when || !q.when.mode || q.when.mode.every(m => ['run', 'daily', 'rush', 'chal', 'event'].includes(m)), q.id + ': only modes there are');
    ok((q.t.match(/\{(\w+)\}/g) || []).every(t => ['{pilot}', '{boss}', '{chal}', '{sector}'].includes(t)), q.id + ': only the run\'s own words in braces');
    if (q.scale) {
      const n = q.c.length, mid = q.mid !== undefined ? q.mid : n % 2 ? (n - 1) / 2 : -1;
      ok(q.mid === undefined || (Number.isInteger(q.mid) && q.mid >= 0 && q.mid < n), q.id + ': its neutral answer one of its own');
      const lo = mid >= 0 ? mid : n / 2, hi = mid >= 0 ? n - mid - 1 : n / 2;
      ok(lo <= 2 && hi <= 2, q.id + ': no more than two answers either side of the middle, for the results\' colours', { lo, hi });
    }
  }
  ok(SURVEY.questions.filter(q => q.lead).length <= 1, 'one lead at most');
  // the game keeps every question, and the rules as given
  const g = loadGame(IDX);
  const kept = JSON.parse(g.run(`JSON.stringify(surveyBankClean(${JSON.stringify(SURVEY)}))`));
  ok(kept && kept.questions.length === SURVEY.questions.length && JSON.stringify(kept.rules) === JSON.stringify(SURVEY.rules),
     'the game\'s check of the bank keeps all of it', kept && kept.questions.map(q => q.id));
  ok(g.run('surveyBankClean({ questions: [{ id: "x", t: "?", c: ["only one"] }, { id: "BAD ID", t: "?", c: ["a", "b"] }] })') === null,
     'and drops what it could not show');
  ok(g.run('JSON.stringify(SURVEY_RULES)') === JSON.stringify(SURVEY.rules), 'the game\'s rules before the bank comes are the bank\'s');
}

/* ---------------------------------------------------------------------- */
section('the route: the bank, to anybody');
{
  const r = await device().call('GET', '/api/survey');
  ok(r.status === 200 && r.d.v === SURVEY.v && r.d.questions.length === SURVEY.questions.length, 'GET: the questions and the rules', r.d);
  ok(/public, max-age=300/.test(r.res.headers.get('cache-control') || ''), 'and kept a few minutes by the browser');
}

section('the route: answers in');
{
  exec(SURVEY_SCHEMA);
  const d = device();
  const no = async (body, what, o, status = 404) => { const r = await d.call('POST', '/api/survey', body, o); ok(r.status === status, what, r.d); };
  await no(survey(), 'from another site: 404', { origin: 'https://evil.example' });
  const plain = await d.call('POST', '/api/survey', undefined, { type: 'text/plain', text: JSON.stringify(survey()) });
  ok(plain.status === 404, 'not as JSON: 404');
  await no(survey({ sid: 'nope' }), 'no id of its own: 400', undefined, 400);
  await no(survey({ pid: '' }), 'a guest with no save id: 400', undefined, 400);
  await no('[1]', 'not an object: 400', undefined, 400);
  const big = await d.call('POST', '/api/survey', undefined, { text: JSON.stringify(survey({ pad: 'x'.repeat(5000) })) });
  ok(big.status === 400, 'too big: 400');
  ok(one('SELECT COUNT(*) AS n FROM survey_answers').n === 0, 'and none of it kept');

  const s1 = survey({ ctx: Object.assign({}, RUN, { sector: 'the forge\u0007', boss: 'the forgeheart' }),
                      answers: [{ q: 'difficulty', a: 3 }, { q: 'difficulty', a: 0 }, { q: 'fun', a: 9 }, { q: 'nope', a: 0 }, { q: 'boss_fair', a: '1' }] });
  const r = await d.call('POST', '/api/survey', s1);
  ok(r.status === 200 && r.d.kept === true, 'a survey: kept', r);
  const rows = all('SELECT * FROM survey_answers ORDER BY q');
  ok(rows.length === 2 && rows.map(x => x.q + '=' + x.a).join() === 'boss_fair=1,difficulty=3',
     'only answers the bank knows, one a question, the first given', rows.map(x => x.q + '=' + x.a));
  const x = rows[0];
  ok(x.pilot === 'ember' && x.mode === 'run' && x.party === 'solo' && x.sector === 'THE FORGE' && x.boss === 'THE FORGEHEART'
     && x.exp === '10-49 runs' && x.device === 'mouse' && x.ver === '2.1' && x.beta === 0 && x.wave === 9,
     'with the run: its pilot, mode, sector in capitals and nothing unprintable, the boss, the player\'s experience', x);
  const c = JSON.parse(x.ctx);
  ok(c.time === 392 && c.score === 4200 && c.died === true && c.runs === 12, 'and the rest of it', c);
  ok(!JSON.stringify(rows).includes(pid(1)), 'the save\'s id is not kept: a hash of it is', x.who);

  const again = await d.call('POST', '/api/survey', s1);
  ok(again.status === 200 && again.d.kept && one('SELECT COUNT(*) AS n FROM survey_answers').n === 2, 'sent again: kept once');
  const none = await d.call('POST', '/api/survey', survey({ answers: [{ q: 'nope', a: 1 }] }));
  ok(none.status === 200 && none.d.kept === false, 'nothing the bank knows: let go', none.d);

  // what the run says is held to plain values
  const w = cleanCtx({ mode: 'pvp', pilot: 'outsider', coop: 1, device: 'tv', ver: '<b>', wave: -4, runs: 1e12, time: 'soon' });
  ok(w.mode === 'run' && w.pilot === '' && w.party === 'coop' && w.device === '' && w.ver === '' && w.wave === 0 && w.runs === 1e7 && w.time === 0,
     'a mode, pilot, device or version the game has not got: none of it', w);
  ok(cleanCtx(null).mode === 'run' && cleanCtx([1]).pilot === '', 'and no run at all: an empty one');
}

section('the route: who, counted once and named nowhere');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  const g1 = device(), g2 = device();
  await g1.call('POST', '/api/survey', survey({ pid: pid(7) }));
  await g2.call('POST', '/api/survey', survey({ pid: pid(7) }));
  await g2.call('POST', '/api/survey', survey({ pid: pid(8) }));
  ok(one('SELECT COUNT(DISTINCT who) AS n FROM survey_answers').n === 2, 'one save on two machines is one player; another save another');
  const acct = await signUp('surveyor_a');
  await acct.call('POST', '/api/survey', survey({ pid: pid(9) }));
  await acct.call('POST', '/api/survey', survey({ pid: '' }));
  const mine = all("SELECT DISTINCT who FROM survey_answers WHERE sid IN (SELECT sid FROM survey_answers ORDER BY at DESC LIMIT 6)");
  const id = one("SELECT id FROM accounts WHERE name = 'surveyor_a'").id;
  ok(one('SELECT COUNT(DISTINCT who) AS n FROM survey_answers').n === 3, 'signed in: the account is the player, whatever save it sends from', mine);
  ok(!JSON.stringify(all('SELECT who FROM survey_answers')).includes(id), 'and its id is kept nowhere');
}

section('the route: a few a day');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  const d = device();
  const kept = [];
  for (let i = 0; i < 10; i++) kept.push((await d.call('POST', '/api/survey', survey({ pid: pid(20) }))).d.kept);
  ok(kept.slice(0, 8).every(Boolean) && kept.slice(8).every(k => k === false), 'one save: eight a day, then let go', kept);
  ok(one('SELECT COUNT(DISTINCT sid) AS n FROM survey_answers').n === 8, 'and only those kept');
  exec("UPDATE auth_gate SET n = 400 WHERE k LIKE 'sv:ip:%'");
  const other = await d.call('POST', '/api/survey', survey({ pid: pid(21) }));
  ok(other.d.kept === false, 'one address: four hundred a day, a classroom\'s worth, then let go', other.d);
  exec("UPDATE auth_gate SET until = 0");
  ok((await d.call('POST', '/api/survey', survey({ pid: pid(21) }))).d.kept === true, 'a new day: kept again');
}

/* ---------------------------------------------------------------------- */
section('an admin\'s: the results');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  const admin = await signUp('survey_admin'), player = await signUp('survey_player'), nobody = device();
  exec(`UPDATE accounts SET perks = '["dev"]' WHERE name = 'survey_admin'`);
  for (const p of [player, nobody])
    for (const q of ['?results=1', '?export=1', '?count=1'])
      ok((await p.call('GET', '/api/survey' + q)).status === 404, 'nobody else: 404 for ' + q);

  // a few runs' surveys, straight into the table: three pilots, a beta build, an old one
  const put = (s, q, a, o = {}) => DB.sql.prepare(`INSERT INTO survey_answers (sid, q, a, at, who, pilot, mode, party, sector, boss, chal, exp, device, ver, beta, wave, ctx)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'solo', ?, ?, '', '10-49 runs', 'mouse', '2.1', ?, 5, '{"time":120,"died":true}')`)
    .run(s, q, a, o.at || Date.now(), o.who || 'w' + s, o.pilot || 'runner', o.mode || 'run', o.sector || 'THE GRID', o.boss || '', o.beta ? 1 : 0);
  put('s1', 'difficulty', 2); put('s1', 'fun', 4);
  put('s2', 'difficulty', 3, { pilot: 'melee', who: 'p2' }); put('s2', 'boss_fair', 3, { pilot: 'melee', boss: 'THE WARDEN', who: 'p2' });
  put('s3', 'difficulty', 4, { pilot: 'melee' });
  put('s4', 'difficulty', 0, { beta: true });
  put('s5', 'difficulty', 1, { at: Date.now() - 40 * 86400000 });

  const r = await admin.call('GET', '/api/survey?results=1');
  const n = (rows, q, a) => rows.filter(x => x.q === q && x.a === a).reduce((s, x) => s + x.n, 0);
  ok(r.status === 200 && r.d.bank && r.d.bank.questions.length === SURVEY.questions.length, 'the counts, with the bank to read them by', r.status);
  ok(r.d.surveys === 3 && r.d.people === 3, 'the last 30 days, beta builds left out: three surveys from three players', r.d);
  ok(n(r.d.rows, 'difficulty', 2) === 1 && n(r.d.rows, 'difficulty', 3) === 1 && n(r.d.rows, 'difficulty', 4) === 1 && n(r.d.rows, 'difficulty', 0) === 0,
     'each answer counted', r.d.rows);
  ok(!JSON.stringify(r.d).includes('"who"') && !JSON.stringify(r.d).includes('p2'), 'no player named, even by hash');
  ok(r.d.dims.pilot.map(v => v.join(':')).join() === 'melee:3,runner:2', 'and every value each dimension takes, for the filters', r.d.dims.pilot);
  ok(DIMS.every(k => Array.isArray(r.d.dims[k])), 'for every dimension');

  const by = await admin.call('GET', '/api/survey?results=1&by=pilot');
  ok(by.d.by === 'pilot' && by.d.rows.filter(x => x.q === 'difficulty' && x.k === 'melee').reduce((t, x) => t + x.n, 0) === 2
     && by.d.rows.filter(x => x.q === 'difficulty' && x.k === 'runner').reduce((t, x) => t + x.n, 0) === 1, 'split by pilot', by.d.rows);
  const only = await admin.call('GET', '/api/survey?results=1&pilot=melee');
  ok(only.d.surveys === 2 && n(only.d.rows, 'difficulty', 2) === 0, 'kept to one pilot', only.d);
  const boss = await admin.call('GET', '/api/survey?results=1&by=boss&boss=THE%20WARDEN');
  ok(boss.d.rows.length === 1 && boss.d.rows[0].q === 'boss_fair' && boss.d.rows[0].k === 'THE WARDEN', 'split and kept to a boss', boss.d.rows);
  const beta = await admin.call('GET', '/api/survey?results=1&beta=1');
  ok(beta.d.surveys === 4 && n(beta.d.rows, 'difficulty', 0) === 1, 'beta builds, when asked for', beta.d);
  const ever = await admin.call('GET', '/api/survey?results=1&days=0');
  ok(ever.d.surveys === 4 && ever.d.since === 0, 'all time: the old one too', ever.d);
  const bad = await admin.call('GET', '/api/survey?results=1&by=who&who=ws1');
  ok(bad.d.by === '' && bad.d.surveys === 3, 'split or kept by anything else: ignored');

  const csv = await admin.raw('GET', '/api/survey?export=1&days=0');
  const text = await csv.text();
  const lines = text.trim().split('\r\n');
  ok(csv.status === 200 && /^text\/csv/.test(csv.headers.get('content-type')) && /attachment; filename="voidrunner-surveys-/.test(csv.headers.get('content-disposition')),
     'the CSV: a file to save');
  ok(lines[0] === CSV_HEAD.join(',') && lines.length === 1 + 6, 'every answer kept, a line each, beta builds left out', lines.length);
  ok(lines.some(l => l.includes(',difficulty,How hard was that run?,2,Just right,')) && lines.some(l => l.includes(',melee,run,solo,THE GRID,THE WARDEN,')),
     'labelled from the bank, with the run', lines.slice(1, 3));

  const week = await admin.call('GET', '/api/survey?count=1');
  ok(week.status === 200 && week.d.week === 3, 'the week\'s count, for the menu\'s card', week.d);
}

/* ---------------------------------------------------------------------- */
section('the tool: the SQL npm run survey sends');
{
  const now = Date.now();
  const sql = resultsSql({ days: 30, now });
  const run = text => { const parts = text.split(';\n').filter(Boolean); exec(parts.slice(0, -1).join(';\n') + ';'); return all(parts[parts.length - 1]); };
  const counts = run(sql.counts), totals = run(sql.totals)[0];
  ok(totals.surveys === 3 && totals.people === 3 && counts.reduce((s, x) => s + x.n, 0) === 5, 'the same counts the page gets', { totals, counts });
  ok(!/["%]/.test(sql.counts.replace(/\s+/g, ' ')) && !/["%]/.test(sql.totals), 'it goes on a command line: no double quote, no percent sign');
  const split = run(resultsSql({ days: 0, by: 'pilot', where: { pilot: 'melee' }, beta: true, now }).counts);
  ok(split.length === 3 && split.every(x => x.k === 'melee'), 'split, kept to a pilot', split);
  let threw = 0;
  for (const f of [() => resultsSql({ by: 'who' }), () => resultsSql({ where: { who: 'x' } }), () => resultsSql({ where: { pilot: "x'; DROP TABLE survey_answers; --" } })])
    try { f(); } catch (e) { threw++; }
  ok(threw === 3, 'a dimension or a value out of its form is refused before any SQL');
  const out = report(run(resultsSql({ days: 30, by: 'pilot', now }).counts), totals, { by: 'pilot' });
  ok(/3 surveys from 3 players/.test(out) && /How hard was that run\?  \[difficulty\]  3 answers  ·  average 4\.00 of 5 \(A bit hard\)/.test(out)
     && /melee\s+2\s/.test(out) && /\(no answers\)/.test(out), 'and what it prints', out.split('\n').slice(0, 14));
}

/* ---------------------------------------------------------------------- */
/* The game, its /api/survey fetches carried to the Worker as a device's; the
   rest of the page's asking is not this test's. */
function game(d, { offline = () => false, search = '' } = {}) {
  const g = loadGame(IDX, { search });
  g.sent = [];
  g.win.fetch = async (url, o = {}) => {
    const u = String(url);
    if (!u.startsWith('/api/survey')) throw new Error('offline');
    g.sent.push({ url: u, method: o.method || 'GET', body: o.body });
    if (offline()) throw new Error('offline');
    const res = await d.raw(o.method || 'GET', u, o.body === undefined ? undefined : JSON.parse(o.body));
    return new Response(await res.text(), { status: res.status, headers: res.headers });
  };
  g.run(`pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'ASKED'; Save.profile.logSeen = 1e9; state = 'menu'; tutSet('off');`);
  return g;
}
// a run of `secs` seconds flown out, then ended as a death (or a quit); what the run came to, as plain data
function fly(g, { secs = 70, seed = 11, quit = false, sandbox = false } = {}) {
  g.run(`applyChar(1); runSeedNext = ${seed}; resetGame(); state = 'play'; P.maxHp = P.hp = 1e7;`);
  if (sandbox) g.run('freeRun = true');
  g.run(`for (let i = 0; i < ${Math.round(secs * 60)}; i++) {
    if (state === 'levelup') { uiArm = 0; handleKey('1'); }
    if (state === 'shop') { uiArm = 0; ui('shopOut'); }
    if (state !== 'play') { if (state === 'dead') break; state = 'play'; }
    update(1 / 60);
  }`);
  const after = g.run('JSON.stringify([simRngState, score, credits, wave, P.kills, P.level])');
  g.run(`gameOver(${quit}); freeRun = false; state = 'menu'`);
  return after;
}
const menu = async g => { g.run('renderMenu()'); await settle(); g.run('renderMenu()'); await settle(); };

section('the game: runs counted, and only ones worth asking about');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  const g = game(device());
  fly(g, { secs: 20 });
  ok(!g.run('Save.profile.survey && Save.profile.survey.n'), 'a short run (under a minute, before wave 3): not counted');
  fly(g, { secs: 70, sandbox: true });
  ok(!g.run('Save.profile.survey && Save.profile.survey.n'), 'a FREEPLAY sandbox: not counted');
  fly(g, { secs: 70 });
  const s = JSON.parse(g.run('JSON.stringify(Save.profile.survey)'));
  ok(s.n === 1 && s.last && s.last.mode === 'run' && s.last.pilot === 'ember' && s.last.died === true && s.last.time === 70 && s.last.device === 'mouse'
     && s.last.ver === g.run('GAME_VER') && s.last.wave >= 1 && s.last.runs >= 1, 'a run: counted, and what it was kept', s.last);
  fly(g, { secs: 70, quit: true });
  ok(g.run('Save.profile.survey.n') === 2 && g.run('Save.profile.survey.last.died') === false, 'quit from the pause screen: counted, as a quit');
  ok(!g.run('Survey.due()'), 'two runs: nothing owed yet');
  await menu(g);
  ok(!g.sent.length, 'and nothing asked of the Worker for it');
}

section('the game: the card, on the menu and never in a run');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  const d = device();
  const g = game(d);
  for (let i = 0; i < 3; i++) fly(g, { secs: 70, seed: 20 + i });
  ok(g.run('Survey.due()'), 'three runs: a survey owed');
  await menu(g);
  ok(g.sent.some(s => s.url === '/api/survey' && s.method === 'GET'), 'the bank asked for, once it is owed', g.sent);
  ok(g.run('Survey.up()'), 'the card up on the menu');
  const qs = JSON.parse(g.run('JSON.stringify(Survey.cur().qs.map(q => q.id))'));
  ok(qs.length === SURVEY.rules.ask && qs[0] === 'difficulty' && new Set(qs).size === qs.length, 'its questions: the lead first, none twice', qs);
  ok(qs.every(id => g.run(`surveyFits(Survey.bank.questions.find(q => q.id === ${JSON.stringify(id)}), Save.profile.survey.last)`)), 'each one fitting the run');
  for (const st of ['play', 'pause', 'levelup', 'shop', 'dead']) {
    g.run(`state = '${st}'`);
    ok(!g.run('Survey.up()'), 'not in ' + st);
    g.run(`handleKey('q')`);
    ok(g.run('state') === st, 'and Q there opens nothing: ' + st);
  }
  g.run(`state = 'menu'; QOL.run = { pilot: 'runner' }`);
  ok(!g.run('Survey.up()'), 'nor over the menu\'s CONTINUE card');
  g.run('QOL.run = null');
  const before = canvasCalls();
  g.run('renderMenu()');
  ok(canvasCalls() > before && g.run('menuSurveyRect().y') === 414, 'drawn under CODEX', g.run('JSON.stringify(menuSurveyRect())'));
  // a click on it opens the panel
  g.run('const r = menuSurveyRect(); mouse.x = r.x + 20; mouse.y = r.y + 10; handleClick()');
  ok(g.run('state') === 'survey' && g.run('Survey.st.i') === 0, 'clicked: the panel, at its first question');
  g.run('uiArm = 0; render()');
  // ESC: shut, and still on offer
  g.run(`handleKey('escape')`);
  ok(g.run('state') === 'menu' && g.run('Survey.up()'), 'LATER: back to the menu, the card still there');
  // Q opens it; the keys answer
  g.run(`handleKey('q')`);
  ok(g.run('state') === 'survey', 'Q opens it');
  g.run(`uiArm = 0; handleKey('4')`);
  ok(g.run('Survey.st.i') === 1 && g.run('Survey.st.ans[0]') === 3, 'a number answers, and on to the next');
  g.run(`handleKey('backspace')`);
  ok(g.run('Survey.st.i') === 0 && g.run('Survey.st.sel') === 3, 'back: the answer given still chosen');
  g.run(`handleKey('arrowup'); handleKey('enter')`);
  ok(g.run('Survey.st.ans[0]') === 2 && g.run('Survey.st.i') === 1, 'the arrows and ENTER answer too');
  g.run('render()');
  // the second by a click on its first answer
  g.run('const gg = surveyGeom(); mouse.x = gg.choices[0].x + 5; mouse.y = gg.choices[0].y + 5; handleClick()');
  ok(g.run('Survey.st.i') === 2 && g.run('Survey.st.ans[1]') === 0, 'a click on an answer answers it');
  const held = g.run('passesLeft()');
  g.run(`handleKey('1')`);
  ok(g.run('Survey.st.done') === true && g.run('state') === 'survey', 'the last answered: the thanks');
  ok(g.run('passesLeft()') === held + SURVEY.rules.pay && g.run('surveyPasses()') === SURVEY.rules.pay, 'and its pass paid at once', g.run('JSON.stringify(Save.profile.surveyPaid)'));
  g.run('render()');
  await settle();
  const post = g.sent.filter(s => s.method === 'POST');
  ok(post.length === 1, 'the answers sent', g.sent);
  const body = JSON.parse(post[0].body);
  ok(/^[0-9a-f]{20}$/.test(body.sid) && body.pid === g.run('myPid()') && body.answers.map(a => a.q).join() === qs.join()
     && body.answers.map(a => a.a).join() === '2,0,0' && body.ctx.pilot === 'ember' && !('tries' in body) && !('t' in body.ctx),
     'which survey, whose save, every answer, the run', body);
  ok(one('SELECT COUNT(*) AS n FROM survey_answers WHERE sid = ?', body.sid).n === qs.length, 'and the Worker kept them');
  ok(g.run('Survey.out.length') === 0, 'told: nothing waits');
  ok(!g.run('Survey.due()') && g.run('Save.profile.survey.n') === 0 && g.run('Save.profile.survey.today') === 1, 'the count starts again');
  // the thanks shut, or straight to the challenges
  g.run(`uiArm = 0; handleKey('k')`);
  ok(g.run('state') === 'chal' && g.run('Survey.st') === null, 'K from the thanks: the challenges, where the pass is spent');
  g.run(`state = 'menu'`);
  ok(!g.run('Survey.up()'), 'and the card gone');
  // the next one: three more runs and the gap after the last
  for (let i = 0; i < 3; i++) fly(g, { secs: 70, seed: 30 + i });
  ok(!g.run('Survey.due()'), 'three more runs, but too soon after the last: not yet');
  g.run(`Save.profile.survey.at -= ${SURVEY.rules.gapMin} * 60000 + 1`);
  ok(g.run('Survey.due()'), 'and once the gap has passed: owed again');
}

section('the game: SKIP lets it go unpaid, what was answered still sent');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  const g = game(device());
  for (let i = 0; i < 3; i++) fly(g, { secs: 70, seed: 40 + i });
  await menu(g);
  g.run(`handleKey('q'); uiArm = 0; handleKey('2'); render()`);
  g.run('const gg = surveyGeom(); mouse.x = gg.skip.x + 4; mouse.y = gg.skip.y + 4; handleClick()');
  await settle();
  ok(g.run('state') === 'menu' && g.run('surveyPasses()') === 0, 'skipped: back to the menu, nothing paid');
  ok(g.run('Save.profile.survey.n') === 0 && !g.run('Survey.up()'), 'and the count starts again');
  const rows = all('SELECT q, a FROM survey_answers');
  ok(rows.length === 1 && rows[0].q === 'difficulty' && rows[0].a === 1, 'the one answer given, kept', rows);
  // turned down before any answer: nothing sent
  for (let i = 0; i < 3; i++) fly(g, { secs: 70, seed: 50 + i });
  g.run(`Save.profile.survey.at = 0`);
  await menu(g);
  const n = g.sent.filter(s => s.method === 'POST').length;
  g.run(`handleKey('q'); uiArm = 0; Survey.close(false)`);
  await settle();
  ok(g.sent.filter(s => s.method === 'POST').length === n, 'none answered: nothing sent');
}

section('the game: offline, the answers wait');
{
  exec('DELETE FROM survey_answers; DELETE FROM auth_gate');
  let down = false;
  const d = device();
  const g = game(d, { offline: () => down });
  for (let i = 0; i < 3; i++) fly(g, { secs: 70, seed: 60 + i });
  await menu(g);                                      // the bank fetched while online
  down = true;
  g.run(`handleKey('q'); uiArm = 0; handleKey('1'); handleKey('1'); handleKey('1')`);
  await settle();
  ok(g.run('surveyPasses()') === SURVEY.rules.pay, 'offline: the pass paid all the same');
  ok(g.run('Survey.out.length') === 1 && JSON.parse(g.win.localStorage.getItem('voidrunner_survey_out_v1')).length === 1, 'and the answers kept in this browser');
  // a later page, online, sends them from the menu
  const later = game(d);
  later.win.localStorage.setItem('voidrunner_survey_out_v1', g.win.localStorage.getItem('voidrunner_survey_out_v1'));
  later.run('Survey.tick()');
  await settle();
  ok(one('SELECT COUNT(DISTINCT sid) AS n FROM survey_answers').n === 1 && later.win.localStorage.getItem('voidrunner_survey_out_v1') === null, 'the next page sends them, and lets them go');
  down = false;
  g.run('Survey.tried = 0; Survey.tick()');
  await settle();
  ok(one('SELECT COUNT(DISTINCT sid) AS n FROM survey_answers').n === 1 && g.run('Survey.out.length') === 0, 'the same from both: kept once');
  // the bank kept too: a page with no network still asks, from what it has
  const cold = game(d, { offline: () => true });
  cold.win.localStorage.setItem('voidrunner_survey_bank_v1', g.win.localStorage.getItem('voidrunner_survey_bank_v1'));
  for (let i = 0; i < 3; i++) fly(cold, { secs: 70, seed: 70 + i });
  await menu(cold);
  ok(cold.run('Survey.up()'), 'a page offline from the start offers one from the bank it kept');
}

section('the game: two stores, the right passes');
{
  const g = game(device());
  const merged = JSON.parse(g.run(`JSON.stringify(Save.merge(
    Object.assign(Save.blank(), { surveyPaid: ['${'a'.repeat(20)}', '${'b'.repeat(20)}:2'], survey: { n: 2, at: 100 }, passUsed: ['ch_glass'] }),
    Object.assign(Save.blank(), { surveyPaid: ['${'a'.repeat(20)}', '${'c'.repeat(20)}'], survey: { n: 0, at: 200 } })))`));
  ok(merged.surveyPaid.length === 3 && merged.survey.at === 200 && merged.passUsed.join() === 'ch_glass', 'paid on either: paid once; the later close wins', merged);
  g.run(`Save.profile.surveyPaid = ${JSON.stringify(merged.surveyPaid)}; Save.profile.passUsed = ['ch_glass']`);
  ok(g.run('surveyPasses()') === 4 && g.run('passesLeft()') === 3, 'four paid, one spent: three left', g.run('passesLeft()'));
  g.run(`Save.profile.surveyPaid.push('not a survey', 'ffffffffffffffffffff:9')`);
  ok(g.run('surveyPasses()') === 4, 'and nothing out of its form pays');
  ok(g.run('surveyLater(null, { n: 1, at: 5 }).n') === 1 && g.run('surveyLater({ n: 3, at: 5 }, { n: 1, at: 5 }).n') === 3, 'a store with none takes the other\'s; a tie keeps the higher count');
}

section('the game: the run is the same run with it as without');
{
  const a = game(device()), b = game(device());
  b.run('Survey.ran = () => false');
  const ra = [fly(a, { secs: 70, seed: 90 }), fly(a, { secs: 70, seed: 91 })];
  const rb = [fly(b, { secs: 70, seed: 90 }), fly(b, { secs: 70, seed: 91 })];
  ok(ra.join() === rb.join(), 'counting a run touches nothing of it', { with: ra, without: rb });
}

section('the game: an admin\'s card');
{
  exec(`UPDATE accounts SET perks = '["dev"]' WHERE name = 'survey_admin'`);
  const admin = await signUp('survey_admin2');
  exec(`UPDATE accounts SET perks = '["dev"]' WHERE name = 'survey_admin2'`);
  const g = game(admin);
  g.run(`Account.me = { name: 'survey_admin2', display: 'survey_admin2' }; Account.admin = true`);
  await menu(g);
  ok(g.sent.some(s => s.url === '/api/survey?count=1'), 'asks how many came in this week');
  ok(Number.isFinite(g.run('Survey.week')), 'and has the count', g.run('Survey.week'));
  g.run('renderMenu()');
  ok(g.run('menuSurveyResultsRect().y') === 454, 'SURVEY RESULTS under the LAB door');
  let opened = null;
  g.win.open = u => { opened = u; };
  g.run('const r = menuSurveyResultsRect(); mouse.x = r.x + 10; mouse.y = r.y + 10; handleClick()');
  ok(opened === '/surveys/' && g.run('state') === 'menu', 'clicked: the results page, in a tab of its own', opened);
  const p = game(device());
  await menu(p);
  ok(!p.sent.some(s => s.url === '/api/survey?count=1'), 'a player\'s menu never asks');
}

console.log(fails ? `\n${fails} FAILED, ${passes} passed` : `\nall ${passes} passed`);
process.exit(fails ? 1 : 0);
