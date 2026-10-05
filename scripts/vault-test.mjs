/* ===========================================================================
   THE VAULT TEST — `npm run test:vault`  (src/vault.js, scripts/vault.mjs)

   The real Worker on a real SQLite database (scripts/lib/d1-sqlite.mjs), and
   the very SQL `npm run vault` sends (scripts/lib/vault-sql.mjs), run as a
   whole file the way wrangler runs it. An entry is put in parts and read
   back byte for byte; only an account holding its perk ever gets it, and
   everybody else gets the answer a missing entry gets; the account reply
   names what may be loaded only to whoever may; a new revision takes over
   only once whole; and the perk itself is given, taken and kept out of the
   awards.
   ========================================================================= */
import { makeD1 } from './lib/d1-sqlite.mjs';
import { putSql, giveSql, takeSql, whoSql, dropSql, PART_BYTES, sha256 } from './lib/vault-sql.mjs';

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

let ipN = 0;
function device() {
  const d = { cookie: '', ip: '10.1.0.' + (++ipN) };
  d.raw = async (method, path, body) => {
    const headers = { 'cf-connecting-ip': d.ip, origin: 'https://voidrunner.online' };
    if (d.cookie) headers.cookie = 'vr_s=' + d.cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await worker.fetch(new Request('https://voidrunner.online' + path,
      { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), env);
    const m = /^vr_s=([^;]*)/.exec(res.headers.get('set-cookie') || '');
    if (m) d.cookie = m[1];
    return res;
  };
  d.call = async (method, path, body) => {
    const res = await d.raw(method, path, body);
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
const fetchVault = (d, q) => d.raw('GET', '/api/vault?' + q);
const perksOf = name => JSON.parse(one('SELECT perks FROM accounts WHERE name = ?', name).perks);

/* A module that is everything a splitter or a quote could trip on: quotes of
   every kind, semicolons, comment markers, CRLF, and characters past ASCII,
   long enough for three parts with the last one a single byte. */
const awkward = n => {
  const bits = ["const a = 'it''s'; -- not a comment\r\n", '/* ; */ "x;y" `z${1}`;\n', 'ÅngstrÖm ☾☀✦ 🌌\n', "DROP TABLE accounts; --\n"];
  let s = '';
  while (Buffer.byteLength(s) < n) s += bits[s.length % bits.length];
  return Buffer.from(s).subarray(0, n);
};

/* ---------------------------------------------------------------------- */
section('a put, as the tool writes it: in parts, read back byte for byte');
const a = await signUp('keeper_a'), b = await signUp('keeper_b'), nobody = device();
const BODY1 = awkward(PART_BYTES * 2 + 1);
{
  const p = putSql('x1', BODY1, 1000);
  ok(p.parts === 3, 'three parts for two parts and a byte', p.parts);
  ok(p.sql.split('\n').every(line => Buffer.byteLength(line) < 100000), 'every statement under D1\'s 100 KB');
  ok(!/[;'-]/.test(p.sql.split('\n').filter(l => l.startsWith('INSERT OR REPLACE INTO vault_parts')).map(l => l.slice(l.lastIndexOf(", '") + 3, -3)).join('')),
     'the parts carry nothing a splitter could trip on');
  exec(p.sql);
  const head = one('SELECT * FROM vault_heads WHERE id = ?', 'x1');
  ok(head && head.rev === 1000 && head.parts === 3 && head.size === BODY1.length && head.hash === sha256(BODY1), 'the head names the whole', head);
  // the empty file is still an entry, of one empty part
  const e = putSql('empty', Buffer.alloc(0), 5);
  exec(e.sql);
  ok(e.parts === 1 && one('SELECT size FROM vault_heads WHERE id = ?', 'empty').size === 0, 'an empty file is one empty part');
}

/* ---------------------------------------------------------------------- */
section('only an account holding the perk gets it; everybody else, nothing');
{
  const shut = [await fetchVault(nobody, 'id=x1'), await fetchVault(a, 'id=x1')];
  ok(shut.every(r => r.status === 404), 'signed out, or signed in without the perk: 404', shut.map(r => r.status));
  const missing = await fetchVault(a, 'id=nope');
  const bodies = await Promise.all([...shut, missing].map(r => r.text()));
  ok(missing.status === 404 && bodies.every(t => t === bodies[2]), 'and word for word what a missing entry answers', bodies);

  exec(giveSql('keeper_a', 'x1'));
  const r = await fetchVault(a, 'id=x1');
  const got = Buffer.from(await r.arrayBuffer());
  ok(r.status === 200 && got.equals(BODY1), 'with the perk: the text, byte for byte', { status: r.status, len: got.length });
  ok(/^text\/javascript/.test(r.headers.get('content-type') || ''), 'as javascript', r.headers.get('content-type'));
  ok(r.headers.get('x-vault-hash') === sha256(BODY1), 'with its hash');
  ok(r.headers.get('cache-control') === 'no-store', 'asked without its hash, never kept', r.headers.get('cache-control'));
  const byHash = await fetchVault(a, 'id=x1&h=' + sha256(BODY1));
  ok(byHash.status === 200 && byHash.headers.get('cache-control') === 'private, max-age=31536000, immutable',
     'asked by its hash, kept by this browser only', byHash.headers.get('cache-control'));
  const stale = await fetchVault(a, 'id=x1&h=' + '0'.repeat(64));
  ok(stale.status === 200 && stale.headers.get('cache-control') === 'no-store', 'asked by an old hash: the current one, not kept');

  ok((await fetchVault(b, 'id=x1')).status === 404, 'another account still gets nothing');
  ok((await fetchVault(a, 'id=empty')).status === 404, 'and the perk opens its own entry, no other');
  ok((await fetchVault(a, 'id=X1')).status === 404 && (await fetchVault(a, 'id=')).status === 404 &&
     (await fetchVault(a, 'id=' + 'a'.repeat(40))).status === 404, 'ids out of the form: 404');
  ok((await a.raw('POST', '/api/vault?id=x1', {})).status === 404, 'nothing but GET');

  // a perk for something not there yet opens nothing, and says nothing
  exec(giveSql('keeper_b', 'later'));
  ok((await fetchVault(b, 'id=later')).status === 404, 'a perk for an entry not put yet: 404');
}

/* ---------------------------------------------------------------------- */
section('the account reply names what may be loaded, to whoever may, and nobody else');
{
  const ra = await a.call('GET', '/api/account');
  ok(ra.status === 200 && Array.isArray(ra.d.vault) && ra.d.vault.length === 1 &&
     ra.d.vault[0].id === 'x1' && ra.d.vault[0].h === sha256(BODY1) && ra.d.vault[0].size === BODY1.length,
     'the holder: its entries, each with its hash and size', ra.d);
  const rb = await b.call('GET', '/api/account');
  ok(rb.status === 200 && !('vault' in rb.d), 'a perk for nothing put yet: no field at all', rb.d);
  const rn = await nobody.call('GET', '/api/account');
  ok(rn.status === 200 && rn.d.account === null && !('vault' in rn.d), 'signed out: no field', rn.d);
  const c = await signUp('keeper_c');
  const rc = await c.call('GET', '/api/account');
  ok(!('vault' in rc.d) && Object.keys(rc.d).sort().join() === 'account,turnstile', 'everybody else: the reply as it always was', rc.d);
}

/* ---------------------------------------------------------------------- */
section('a new revision takes over only once it is whole');
{
  const BODY2 = Buffer.from('second; revision\n'.repeat(9000));
  // half a put: the parts of a new revision, with no head moved to it yet
  const p2 = putSql('x1', BODY2, 2000);
  exec(p2.sql.split('\n').filter(l => l.startsWith('INSERT OR REPLACE INTO vault_parts')).slice(0, 1).join('\n'));
  let r = await fetchVault(a, 'id=x1');
  ok(Buffer.from(await r.arrayBuffer()).equals(BODY1), 'parts written, head not moved: the old one, whole');
  exec(p2.sql);
  r = await fetchVault(a, 'id=x1');
  ok(Buffer.from(await r.arrayBuffer()).equals(BODY2) && r.headers.get('x-vault-hash') === sha256(BODY2), 'the head moved: the new one');
  ok(all('SELECT DISTINCT rev FROM vault_parts WHERE id = ? ORDER BY rev', 'x1').map(x => x.rev).join() === '1000,2000',
     'the one before is kept, for a read already under way');
  const BODY3 = Buffer.from('third\n');
  exec(putSql('x1', BODY3, 3000).sql);
  ok(all('SELECT DISTINCT rev FROM vault_parts WHERE id = ? ORDER BY rev', 'x1').map(x => x.rev).join() === '2000,3000',
     'and anything older swept on the next put');
  r = await fetchVault(a, 'id=x1');
  ok(Buffer.from(await r.arrayBuffer()).equals(BODY3), 'served from the newest');
  const ra = await a.call('GET', '/api/account');
  ok(ra.d.vault[0].h === sha256(BODY3), 'and the account reply names the new hash');

  // a head whose parts are not all there is an error, never half a module
  exec("DELETE FROM vault_parts WHERE id = 'x1' AND rev = 3000");
  exec(putSql('x1', BODY2, 4000).sql);
  exec("DELETE FROM vault_parts WHERE id = 'x1' AND rev = 4000 AND part = 1");
  r = await fetchVault(a, 'id=x1');
  ok(r.status === 500, 'a part missing: an error, not a short text', r.status);
  exec(putSql('x1', BODY1, 5000).sql);
  r = await fetchVault(a, 'id=x1');
  ok(r.status === 200 && Buffer.from(await r.arrayBuffer()).equals(BODY1), 'and the next put mends it');
}

/* ---------------------------------------------------------------------- */
section('the perk: given once, taken alone, never an award');
{
  exec("UPDATE accounts SET perks = '[\"dev\"]' WHERE name = 'keeper_c'");
  exec(giveSql('keeper_c', 'x1')); exec(giveSql('keeper_c', 'x1'));
  ok(JSON.stringify(perksOf('keeper_c')) === '["dev","vault:x1"]', 'given twice, held once, beside the rest', perksOf('keeper_c'));
  ok(all(whoSql('x1')).map(r => r.name).join() === 'keeper_a,keeper_c', 'who: the holders', all(whoSql('x1')));
  exec(takeSql('keeper_c', 'x1'));
  ok(JSON.stringify(perksOf('keeper_c')) === '["dev"]', 'taken: only that one goes', perksOf('keeper_c'));
  exec(takeSql('keeper_c', 'x1'));
  ok(JSON.stringify(perksOf('keeper_c')) === '["dev"]', 'taken again: nothing changes');
  exec("UPDATE accounts SET perks = '[\"vault:x1\"]' WHERE name = 'keeper_b'");
  exec(takeSql('keeper_b', 'x1'));
  ok(JSON.stringify(perksOf('keeper_b')) === '[]', 'the last one taken leaves an empty list', perksOf('keeper_b'));
  exec(giveSql('keeper_c', 'x1'));
  // the awards a device of the account collects: the dev perks, and not the vault's
  const pid = one('SELECT pid FROM accounts WHERE name = ?', 'keeper_c').pid;
  const c = device();
  const login = await c.call('POST', '/api/account', { op: 'login', name: 'keeper_c', pass: 'correct horse keeper_c', pid });
  ok(login.status === 200, 'signed in again', login);
  const aw = await c.call('GET', '/api/leaderboard?awards=' + pid);
  const said = JSON.stringify(aw.d);
  ok(aw.status === 200 && /unlock-all/.test(said) && !/vault/.test(said), 'the awards carry the dev perks and nothing of the vault', aw.d);
  exec(dropSql('x1'));
  ok(!one("SELECT 1 AS n FROM vault_heads WHERE id = 'x1'") && !one("SELECT 1 AS n FROM vault_parts WHERE id = 'x1'"), 'drop: gone, every revision');
  ok((await fetchVault(a, 'id=x1')).status === 404 && !('vault' in (await a.call('GET', '/api/account')).d), 'and nobody is offered it');
}

console.log(fails ? `\n${fails} FAILED, ${passes} passed` : `\nall ${passes} passed`);
process.exit(fails ? 1 : 0);
