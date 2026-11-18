/* ===========================================================================
   THE TYRANTS FELLED — the test: `npm run test:felled`  (src/felled.js; FELLED
   in index.html; scripts/felled.mjs)

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), and
   the game booted in Node (scripts/lib/game-vm.mjs) with the tests' stand-in
   rooms apart (fixtures/up-apart.js) run as a tyrant's vault entry, its
   fetches carried to that same Worker:
     the route    only a tyrant's entry, one the account may load, a boss its
                  text names; signed in, from our own pages, as JSON; a report
                  sent twice counts once; a new felling is unread again
     the alert    an account's first felling of each tyrant posted to the
                  webhook (Discord's, Slack's, or plain text); repeats are not
     an admin's   the list (and nobody else's), marked read up to a moment
     the game     the boss of a room apart down: reported, with nothing of the
                  run touched; never from a sandbox, signed out, or another
                  module's boss; a report that cannot get through waits and
                  goes later; an admin's menu card, its list, and read
     the tool     the SQL `npm run felled` sends, run as it would be
   ========================================================================= */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { makeD1 } from './lib/d1-sqlite.mjs';
import { putSql, giveSql, openSql } from './lib/vault-sql.mjs';
import { listSql, seenSql, forgetSql } from './lib/felled-sql.mjs';
import { loadGame } from './lib/game-vm.mjs';
import { TYRANTS, webhookBody, FELLED_SCHEMA } from '../src/felled.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const IDX = path.join(here, '..', 'index.html');
const APART = fs.readFileSync(path.join(here, 'fixtures', 'up-apart.js'), 'utf8');

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

/* The webhook's other end: every post the Worker makes, kept. The Worker's
   own fetch is the global one; the game's is its window's, below. */
const hooked = [];
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, o = {}) => {
  hooked.push({ url: String(url), type: (o.headers || {})['content-type'], body: o.body });
  return new Response('ok');
};

let ipN = 0;
function device() {
  const d = { cookie: '', ip: '10.2.0.' + (++ipN) };
  d.raw = async (method, p, body, { origin = 'https://voidrunner.online', type = 'application/json', text } = {}) => {
    const headers = { 'cf-connecting-ip': d.ip };
    if (origin) headers.origin = origin;
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined || text !== undefined) headers['content-type'] = type;
    const ctx = { waits: [], waitUntil(p2) { this.waits.push(p2); } };
    const res = await worker.fetch(new Request('https://voidrunner.online' + p,
      { method, headers, body: text !== undefined ? text : body === undefined ? undefined : JSON.stringify(body) }), env, ctx);
    await Promise.all(ctx.waits);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    return res;
  };
  d.call = async (method, p, body, o) => {
    const res = await d.raw(method, p, body, o);
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
  return d;
}
const devPerk = name => exec(`UPDATE accounts SET perks = '["dev"]' WHERE name = '${name}'`);
let ridN = 0;
const report = (over = {}) => Object.assign({ mod: 'n5', boss: 'x1b', name: 'The Other Stand-In', room: 'APART ONE', pilot: 'VOIDRUNNER', coop: false, rid: 'r' + (++ridN) }, over);

/* The tyrants' entries: n5 open to every signed-in account, n6 only to its
   perk's holders, and x1 open but nobody's tyrant. Each is the stand-in. */
ok(TYRANTS.includes('n5') && TYRANTS.includes('n6'), 'the tyrants are n5\'s and n6\'s');
for (const id of ['n5', 'n6', 'x1']) exec(putSql(id, Buffer.from(APART)).sql);
exec(openSql('n5', true)); exec(openSql('x1', true));
exec(FELLED_SCHEMA);

const a = await signUp('slayer_a'), b = await signUp('slayer_b'), boss = await signUp('maker_c'), nobody = device();
devPerk('maker_c');

/* ---------------------------------------------------------------------- */
section('the account reply marks a tyrant\'s entry');
{
  const r = await a.call('GET', '/api/account');
  const v = (r.d && r.d.vault) || [];
  ok(v.map(x => x.id).join() === 'n5,x1', 'the open entries', v);
  ok(v.find(x => x.id === 'n5').t === 1 && !('t' in v.find(x => x.id === 'x1')), 'only the tyrant\'s carries t', v);
  const s = await nobody.call('GET', '/api/account');
  ok(!s.d.vault, 'signed out: nothing');
}

/* ---------------------------------------------------------------------- */
section('the route: a tyrant down, written down');
{
  const no = async (d, body, what, o) => { const r = await d.call('POST', '/api/felled', body, o); ok(r.status === 404, what, r); };
  await no(nobody, report(), 'signed out: the vault\'s 404');
  await no(a, report({ mod: 'x1' }), 'an entry that is nobody\'s tyrant: 404');
  await no(a, report({ mod: 'n6' }), 'a tyrant\'s entry this account may not load: 404');
  await no(a, report({ boss: 'nobody_here' }), 'a boss its text never names: 404');
  await no(a, report({ boss: 'x1' }), 'nor a word that is only part of one');
  await no(a, report(), 'from another site: 404', { origin: 'https://evil.example' });
  const plain = await a.call('POST', '/api/felled', undefined, { type: 'text/plain', text: JSON.stringify(report()) });
  ok(plain.status === 404, 'not as JSON: 404', plain);
  const bad = await a.call('POST', '/api/felled', report({ rid: '' }));
  ok(bad.status === 404, 'with no id of its own: 404', bad);
  ok(one('SELECT COUNT(*) AS n FROM felled').n === 0, 'and none of it written');

  hooked.length = 0;
  const r = await a.call('POST', '/api/felled', report({ rid: 'first-one', name: 'the other stand-in\u0007' }));
  ok(r.status === 200 && r.d.told === true && r.d.first === true, 'told: the first anybody has felled it', r);
  const row = one('SELECT * FROM felled');
  ok(row && row.mod === 'n5' && row.boss === 'x1b' && row.name === 'THE OTHER STAND-IN' && row.who === 'slayer_a' && row.times === 1 && row.seen === 0,
     'one row: which, by whom, once, unread, its name in capitals and nothing unprintable', row);
  ok(JSON.parse(row.info).room === 'APART ONE' && JSON.parse(row.info).pilot === 'VOIDRUNNER', 'and where', row.info);
  ok(hooked.length === 0, 'no webhook set: nothing posted');

  const again = await a.call('POST', '/api/felled', report({ rid: 'first-one' }));
  ok(again.status === 200 && one('SELECT times FROM felled').times === 1, 'the same report sent again: counted once', again);
  exec('UPDATE felled SET seen = 1');
  const twice = await a.call('POST', '/api/felled', report());
  const r2 = one('SELECT * FROM felled');
  ok(twice.status === 200 && twice.d.first === false && r2.times === 2 && r2.seen === 0 && r2.last >= r2.first, 'felled again: twice, and unread again', r2);
  const perk = await b.call('POST', '/api/felled', report({ mod: 'n6' }));
  ok(perk.status === 404, 'b may not load n6 either');
  exec(giveSql('slayer_b', 'n6'));
  const n6 = await b.call('POST', '/api/felled', report({ mod: 'n6' }));
  ok(n6.status === 200 && n6.d.first === true, 'with n6\'s perk: told, the first of n6\'s', n6);
}

/* ---------------------------------------------------------------------- */
section('the alert: each account\'s first felling of each tyrant, posted');
{
  env.FELLED_WEBHOOK = 'https://discord.com/api/webhooks/1/x';
  hooked.length = 0;
  await a.call('POST', '/api/felled', report());
  ok(hooked.length === 0, 'an account felling one it has felled before: not posted again', hooked);
  await b.call('POST', '/api/felled', report());
  ok(hooked.length === 1 && hooked[0].url === env.FELLED_WEBHOOK, 'another account\'s first: posted', hooked);
  const m = JSON.parse(hooked[0].body);
  ok(/A TYRANT HAS FALLEN: THE OTHER STAND-IN \(vault n5, boss x1b\)/.test(m.content) && /by slayer_b in APART ONE, flying VOIDRUNNER/.test(m.content)
     && /Felled before by 1 other account\./.test(m.content), 'Discord\'s shape, with which, who and where', m);
  ok(Array.isArray(m.allowed_mentions.parse) && m.allowed_mentions.parse.length === 0, 'and pinging nobody');
  exec("DELETE FROM felled WHERE mod = 'n6'");
  hooked.length = 0;
  await b.call('POST', '/api/felled', report({ mod: 'n6', coop: true }));
  ok(hooked.length === 1 && /The first time anyone has felled it\. It is still in the game/.test(JSON.parse(hooked[0].body).content)
     && /, in co-op,/.test(JSON.parse(hooked[0].body).content), 'the first ever says so, and that it is still there', hooked);
  const slack = webhookBody('https://hooks.slack.com/services/x', 'hi'), plain = webhookBody('https://ntfy.sh/some-topic', 'hi');
  ok(JSON.parse(slack.body).text === 'hi' && slack.type === 'application/json', 'Slack\'s shape');
  ok(plain.body === 'hi' && /^text\/plain/.test(plain.type), 'anywhere else, plain text');
  ok(webhookBody('not a url', 'hi') === null, 'and nothing for a URL that is not one');
  // a webhook that fails never fails the report
  globalThis.fetch = async () => { throw new Error('down'); };
  exec("DELETE FROM felled WHERE mod = 'n6'");
  const quiet = console.error; console.error = () => {};
  const r = await b.call('POST', '/api/felled', report({ mod: 'n6' }));
  console.error = quiet;
  ok(r.status === 200 && r.d.told, 'the webhook down: still told', r);
  globalThis.fetch = async (url, o = {}) => { hooked.push({ url: String(url), type: (o.headers || {})['content-type'], body: o.body }); return new Response('ok'); };
  delete env.FELLED_WEBHOOK;
}

/* ---------------------------------------------------------------------- */
section('an admin\'s: the list, and read');
{
  ok((await a.call('GET', '/api/felled')).status === 404 && (await nobody.call('GET', '/api/felled')).status === 404, 'nobody else may read it');
  ok((await a.call('POST', '/api/felled', { seen: Date.now() })).status === 404, 'nor mark it read');
  const r = await boss.call('GET', '/api/felled');
  const f = (r.d && r.d.felled) || [];
  ok(r.status === 200 && f.length === 3, 'an admin: every felling', r);
  ok(f.every(x => !x.seen) && f.every(x => typeof x.last === 'number' && x.mod && x.boss && x.who && x.info), 'unread, each whole', f);
  ok(f.filter(x => x.mod === 'n5' && x.firstEver).map(x => x.who).join() === 'slayer_a', 'the first to fell n5\'s is marked so', f);
  ok(!JSON.stringify(r.d).includes(one("SELECT id FROM accounts WHERE name = 'slayer_a'").id), 'no account\'s id ever leaves');
  const upTo = Math.max(...f.map(x => x.last));
  await new Promise(res => setTimeout(res, 5));
  await a.call('POST', '/api/felled', report());              // lands after the list was read
  const m = await boss.call('POST', '/api/felled', { seen: upTo });
  ok(m.status === 200 && m.d.seen === 2, 'marked read up to what was shown', m);
  const left = (await boss.call('GET', '/api/felled')).d.felled;
  ok(left.filter(x => !x.seen).map(x => x.who).join() === 'slayer_a' && left[0].who === 'slayer_a' && !left[0].seen, 'the one that landed meanwhile stays unread, and first', left);
  ok((await boss.call('POST', '/api/felled', { seen: 'soon' })).status === 400, 'a moment that is not one: refused');
}

/* ---------------------------------------------------------------------- */
section('the tool: the SQL npm run felled sends');
{
  const rows = all(listSql().split('\n').slice(1).join('\n'));
  exec(listSql().split('\n')[0]);
  ok(rows.length === 3 && rows[0].seen === 0 && /^\d{4}-\d\d-\d\d \d\d:\d\d:\d\d$/.test(rows[0].lastAt), 'list: every felling, unread first, with its times', rows[0]);
  ok(!/["%]/.test(listSql().replace(/\s+/g, ' ')), 'list goes on a command line: no double quote, no percent sign');
  exec(seenSql(Date.now() + 1000));
  ok(one('SELECT COUNT(*) AS n FROM felled WHERE seen = 0').n === 0, 'seen: everything read');
  exec(forgetSql('n6'));
  ok(one("SELECT COUNT(*) AS n FROM felled WHERE mod = 'n6'").n === 0 && one("SELECT COUNT(*) AS n FROM felled WHERE mod = 'n5'").n === 2, 'forget an entry: its fellings gone, no other\'s');
  exec(forgetSql('n5', 'x1b'));
  ok(one('SELECT COUNT(*) AS n FROM felled').n === 0, 'forget one boss of it');
  let threw = 0;
  for (const f of [() => forgetSql('N5'), () => forgetSql('n5', "x'; DROP TABLE felled; --")]) { try { f(); } catch (e) { threw++; } }
  ok(threw === 2, 'an id or a key out of its form is refused before any SQL');
}

/* ---------------------------------------------------------------------- */
/* The game, its fetches carried to the Worker as a device's: the account's
   cookie and our own origin, as a browser on voidrunner.online sends them. */
function game(d, { offline = () => false } = {}) {
  const g = loadGame(IDX);
  g.sent = [];
  g.win.fetch = async (url, o = {}) => {
    const u = String(url);
    if (u !== '/api/felled') throw new Error('offline');      // the rest of the page's asking (its account, the vault) is not this test's
    g.sent.push({ url: u, method: o.method || 'GET', body: o.body });
    if (offline()) throw new Error('offline');
    const res = await d.raw(o.method || 'GET', u, o.body === undefined ? undefined : JSON.parse(o.body));
    return new Response(await res.text(), { status: res.status, headers: res.headers });
  };
  g.run(`pageDead = true; Save.profile.gfxSeen = GFX_VER; Save.profile.name = 'FELL'; state = 'menu'; tutSet('off');`);
  g.run('Outside.run("n5", ' + JSON.stringify(APART) + ')');
  g.run('Felled.take([{ id: "n5", h: "x", size: 1, t: 1 }, { id: "x1", h: "y", size: 1 }])');
  g.run(`Account.me = { name: ${JSON.stringify(d.name || '')}, display: ${JSON.stringify(d.name || '')} }`);
  return g;
}
const settle = () => new Promise(res => setTimeout(res, 20));
const step = (g, sec) => g.run(`for (let i = 0; i < ${Math.round(sec * 60)}; i++) {
    if (state === 'levelup') { uiArm = 0; handleKey('1'); }
    if (state === 'shop') { uiArm = 0; ui('shopOut'); }
    if (state !== 'play') { if (state === 'dead') break; state = 'play'; }
    update(1 / 60);
  }`);
// a run, taken into room 0 apart, its boss come and put down; what the run is after, as plain data
function fell(g, { sandbox = false } = {}) {
  g.run(`applyChar(0); runSeedNext = 11; resetGame(); state = 'play'; P.maxHp = P.hp = 1e7; P.dmg *= 40;`);
  if (sandbox) g.run('freeRun = true');
  step(g, 2);
  g.run('for (const e of enemies.slice()) if (!e.dead && !e.hacked) killEnemy(e); spawnBudget = 0; bossAlive = false; upLiftT = -1');
  const went = g.run('upAway("n5", 0)');
  step(g, 4);
  const up = g.run('bossAlive && enemies.some(e => e.boss === "x1b" && !e.dead)');
  g.run('for (const e of enemies.slice()) if (!e.dead && e.boss === "x1b") killEnemy(e)');
  return { went, up, after: g.run('JSON.stringify([simRngState, score, credits, wave, upWorld.felled, state])') };
}

section('the game: a tyrant down in a run, reported');
{
  exec('DELETE FROM felled');
  const g = game(a);
  ok(g.run('Felled.mods.has("n5") && !Felled.mods.has("x1")'), 'it knows which entries are tyrants\' from the account reply');
  const f = fell(g);
  ok(f.went && f.up, 'the run went into the room apart, and its boss came', f);
  await settle();
  const post = g.sent.filter(s => s.method === 'POST');
  ok(post.length === 1 && post[0].url === '/api/felled', 'the moment it fell: one report', g.sent);
  const body = JSON.parse(post[0].body);
  ok(body.mod === 'n5' && body.boss === 'x1b' && body.name === 'THE OTHER STAND-IN' && body.room === 'APART ONE' && body.pilot === 'VOIDRUNNER'
     && body.coop === false && /^[0-9a-f]{20}$/.test(body.rid) && !('tries' in body), 'which, where, flown as what, and an id of its own', body);
  const row = one('SELECT * FROM felled');
  ok(row && row.who === 'slayer_a' && row.name === 'THE OTHER STAND-IN', 'and the Worker wrote it down', row);
  ok(g.run('Felled.out.length') === 0 && g.win.localStorage.getItem('voidrunner_felled_out_v1') === null, 'told: nothing waits');
  // the same run without the report: everything of the run the same
  const quiet = game(a);
  quiet.run('Felled.mods.clear()');
  const q = fell(quiet);
  await settle();
  ok(q.after === f.after && !quiet.sent.some(s => s.method === 'POST'), 'the run is the same run with it as without: nothing of the run touched', { with: f.after, without: q.after });
}

section('the game: not from a sandbox, signed out, or another module\'s boss');
{
  const s = game(a);
  const f = fell(s, { sandbox: true });
  await settle();
  ok(f.up && !s.sent.some(x => x.method === 'POST'), 'a FREEPLAY sandbox: nothing told', s.sent);
  const out = game(a);
  out.run('Account.me = null');
  fell(out);
  await settle();
  ok(!out.sent.some(x => x.method === 'POST') && out.run('Felled.out.length') === 0, 'signed out: nothing told, nothing kept');
  const other = game(a);
  other.run('Felled.take([{ id: "x1", h: "y", size: 1 }])');
  fell(other);
  await settle();
  ok(!other.sent.some(x => x.method === 'POST'), 'a module that is nobody\'s tyrant: nothing told');
  ok(other.run('Felled.saw({ type: "boss", boss: "nullcore" })') === false && other.run('Felled.saw(null)') === false, 'nor any boss of the game\'s own');
}

section('the game: a report that cannot get through waits, and goes later');
{
  exec('DELETE FROM felled');
  let down = true;
  const g = game(a, { offline: () => down });
  fell(g);
  await settle();
  ok(g.run('Felled.out.length') === 1 && JSON.parse(g.win.localStorage.getItem('voidrunner_felled_out_v1')).length === 1, 'offline: it waits, kept in this browser');
  ok(one('SELECT COUNT(*) AS n FROM felled').n === 0, 'and the Worker has nothing yet');
  // a page loaded later finds it waiting, and sends it from the menu
  const later = game(a);
  later.win.localStorage.setItem('voidrunner_felled_out_v1', g.win.localStorage.getItem('voidrunner_felled_out_v1'));
  later.run('Felled.tick()');
  await settle();
  ok(one('SELECT COUNT(*) AS n FROM felled').n === 1 && later.run('Felled.out.length') === 0 && later.win.localStorage.getItem('voidrunner_felled_out_v1') === null,
     'the next page sends it from the menu, and lets it go', later.sent);
  // and the first page, back online, sends the same one: counted once
  down = false;
  g.run('Felled.tried = 0; Felled.tick()');
  await settle();
  ok(one('SELECT times FROM felled').times === 1 && g.run('Felled.out.length') === 0, 'the same report from both: counted once');
  // refused every time (a session gone): let go after its tries
  const lost = game(nobody);
  lost.run('Account.me = { name: "ghost", display: "ghost" }');
  fell(lost);
  for (let i = 0; i < 10; i++) { await settle(); lost.run('Felled.tried = 0; Felled.tick()'); }
  await settle();
  ok(lost.run('Felled.out.length') === 0 && lost.sent.filter(x => x.method === 'POST').length === 8, 'refused: tried FELLED_TRIES times, then let go', lost.sent.length);
}

section('an admin\'s menu: the card, its list, and read');
{
  exec('DELETE FROM felled');
  await a.call('POST', '/api/felled', report());
  await b.call('POST', '/api/felled', report());
  const g = game(boss);
  g.run('Account.admin = true; state = "menu"');
  g.run('renderMenu()');
  await settle();
  ok(g.run('Felled.news.length') === 2 && g.run('felledUp()'), 'the menu asked: two unread, and the card is up', g.sent);
  g.run('renderMenu()');
  const card = g.run('menuFelledRect()');
  g.run(`mouse.x = ${card.x + 20}; mouse.y = ${card.y + 10}; handleClick()`);
  ok(g.run('Felled.open') === true, 'a click on the card opens the list');
  let drew = true;
  try { g.run('renderMenu()'); } catch (e) { drew = false; console.log(e); }
  ok(drew, 'the card and its list draw');
  const L = g.run('felledListRect()');
  ok(L.x >= card.x + card.w && L.y >= 14 && L.y + L.h <= 720, 'the list beside the card, on the screen', L);
  g.run(`mouse.x = ${L.x + 30}; mouse.y = ${L.y + L.h - 10}; handleClick()`);
  await settle();
  ok(g.run('Felled.news.length') === 0 && !g.run('felledUp()') && one('SELECT COUNT(*) AS n FROM felled WHERE seen = 0').n === 0, 'a click on the list: read, here and on the Worker');
  // nobody but an admin is shown or asks
  const p = game(a);
  p.run('state = "menu"; renderMenu()');
  await settle();
  ok(!p.sent.some(x => x.url === '/api/felled') && !p.run('felledUp()'), 'a player\'s menu asks nothing and shows nothing');
}

globalThis.fetch = realFetch;
console.log('\n' + passes + ' passed, ' + fails + ' failed');
process.exit(fails ? 1 : 0);
