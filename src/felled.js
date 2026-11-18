/* ===========================================================================
   THE TYRANTS, FELLED — POST /api/felled, GET /api/felled (index.html, FELLED)

   The tyrants are the bosses of the vault entries named in TYRANTS. Each is
   meant to be one of a kind, and nothing in the game or the modules takes
   one away once it is down: the room and its boss go on being there for the
   next run. So whenever one falls, it is written down here and an admin is
   told, and whoever made it can decide what happens to it (a new revision
   of the module, or `npm run vault -- shut <id>`).

     POST { mod, boss, name, room, pilot, coop, rid }
                    the game, the moment a tyrant falls in a run (never a
                    FREEPLAY sandbox, PvP or the dev server's). Signed in,
                    from one of our own pages, as JSON. `mod` must be one of
                    TYRANTS that this account may load (its perk, or the
                    entry is open), and `boss` a word that appears in that
                    entry's text, or the answer is the vault's 404. `rid` is
                    the report's own id: the same report sent again (a retry
                    whose answer was lost) is not counted twice.
                    -> { told: true, first }  (first: nobody had felled it before)
     GET            an admin's (the 'dev' perk): every felling, newest first
                    -> { felled: [{ mod, boss, name, who, first, last, times,
                                    info, seen, firstEver }] }
     POST { seen }  an admin's: every felling up to `seen` (a `last` the GET
                    gave) is marked read, so one that lands in between stays
                    unread -> { seen: n }
   Anybody else gets the vault's 404, as a missing entry does.

   One row per tyrant per account: who felled it, when first and when last,
   how many times. A new felling marks its row unread again.

   ALERTS. An admin's menu shows the unread ones (index.html, FELLED). And
   if the Worker has a secret FELLED_WEBHOOK (`npx wrangler secret put
   FELLED_WEBHOOK`), an account's first felling of each tyrant is posted to
   it as it happens: a Discord or Slack incoming webhook's URL, or any other
   URL that takes a plain-text POST (an ntfy.sh topic, for a phone). Repeat
   fellings by the same account are counted, not posted again.
   ========================================================================= */
import { sessionOf, originOk } from './auth.js';
import { vaultText, mayLoad, nothing } from './vault.js';

// the vault entries whose bosses are tyrants
export const TYRANTS = ['n5', 'n6'];

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS felled (
     mod      TEXT    NOT NULL,            -- the vault entry
     boss     TEXT    NOT NULL,            -- its boss's key in the module
     account  TEXT    NOT NULL,
     name     TEXT    NOT NULL,            -- the boss, as the game named it
     who      TEXT    NOT NULL,            -- the account's name, as it was shown then
     first    INTEGER NOT NULL,            -- when this account first felled it
     last     INTEGER NOT NULL,            -- and most lately
     times    INTEGER NOT NULL,
     rid      TEXT,                        -- the latest report's id
     info     TEXT,                        -- the latest report's room, pilot and co-op, as JSON
     seen     INTEGER NOT NULL DEFAULT 0,  -- an admin has read it since its latest felling
     PRIMARY KEY (mod, boss, account))`
];
// the same table, for scripts/felled.mjs to put ahead of its own SQL: one line, comments out
export const FELLED_SCHEMA = SCHEMA.map(s => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ') + ';').join('\n');

let ready = null;
export function ensureFelled(db) {
  if (!ready) ready = db.batch(SCHEMA.map(s => db.prepare(s))).catch(e => { ready = null; throw e; });
  return ready;
}

const BOSS = /^[A-Za-z_$][A-Za-z0-9_$]{0,39}$/;
const RID = /^[A-Za-z0-9._-]{1,40}$/;
// a short line of printable text, or ''
const words = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, n) : '';
// the key stands in the module's text as a word of its own (a key of its bosses, quoted or not)
const named = (text, key) => new RegExp('(^|[^A-Za-z0-9_$])' + key.replace(/\$/g, '\\$') + '($|[^A-Za-z0-9_$])').test(text);

const reply = (body, status = 200) => new Response(JSON.stringify(body), {
  status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

// the unread fellings, for an admin
export async function unreadFelled(db) {
  await ensureFelled(db);
  const r = await db.prepare('SELECT COUNT(*) AS n FROM felled WHERE seen = 0').first();
  return (r && r.n) || 0;
}

/* The alert, posted to FELLED_WEBHOOK: Discord's and Slack's webhooks take
   JSON of their own shape; anything else, the words as plain text. */
export function webhookBody(url, text) {
  let host = '';
  try { host = new URL(url).hostname; } catch (e) { return null; }
  if (/(^|\.)discord(app)?\.com$/.test(host)) return { type: 'application/json', body: JSON.stringify({ content: text, allowed_mentions: { parse: [] } }) };
  if (/(^|\.)slack\.com$/.test(host)) return { type: 'application/json', body: JSON.stringify({ text }) };
  return { type: 'text/plain; charset=utf-8', body: text };
}
async function post(env, text) {
  const url = env.FELLED_WEBHOOK;
  const b = url ? webhookBody(url, text) : null;
  if (!b) return;
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'content-type': b.type, title: 'A tyrant has fallen' }, body: b.body,
                                 signal: AbortSignal.timeout(8000) });
    if (!r.ok) console.error('felled webhook: ' + r.status);
  } catch (e) { console.error('felled webhook:', e && e.message || e); }
}

async function told(req, env, ctx, s, b) {
  const mod = typeof b.mod === 'string' ? b.mod : '', boss = typeof b.boss === 'string' ? b.boss : '';
  const rid = typeof b.rid === 'string' && RID.test(b.rid) ? b.rid : '';
  if (!TYRANTS.includes(mod) || !BOSS.test(boss) || !rid) return nothing();
  if (!(await mayLoad(env.DB, s.account, mod))) return nothing();
  const got = await vaultText(env.DB, mod);
  if (!got || !named(got.text, boss)) return nothing();
  await ensureFelled(env.DB);
  const name = words(b.name, 40).toUpperCase() || boss.toUpperCase();
  const info = JSON.stringify({ room: words(b.room, 40), pilot: words(b.pilot, 24), coop: !!b.coop });
  const now = Date.now();
  const before = await env.DB.prepare('SELECT account, rid FROM felled WHERE mod = ?1 AND boss = ?2').bind(mod, boss).all();
  const rows = (before && before.results) || [];
  const mine = rows.find(r => r.account === s.account.id);
  if (mine && mine.rid === rid) return reply({ told: true, first: false });   // sent again: already counted
  await env.DB.prepare(
    `INSERT INTO felled (mod, boss, account, name, who, first, last, times, rid, info, seen)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6, 1, ?7, ?8, 0)
     ON CONFLICT (mod, boss, account) DO UPDATE SET
       name = excluded.name, who = excluded.who, last = excluded.last, times = felled.times + 1,
       rid = excluded.rid, info = excluded.info, seen = 0`)
    .bind(mod, boss, s.account.id, name, s.account.display || s.account.name, now, rid, info).run();
  const first = rows.length === 0;
  console.log('felled: ' + name + ' (' + mod + '/' + boss + ') by ' + s.account.name + (first ? ', the first' : ''));
  if (!mine && env.FELLED_WEBHOOK) {
    const others = rows.length;
    const text = '⚠ VOIDRUNNER — A TYRANT HAS FALLEN: ' + name + ' (vault ' + mod + ', boss ' + boss + ')\n'
      + 'Felled by ' + (s.account.display || s.account.name) + (b.room ? ' in ' + words(b.room, 40) : '')
      + (b.pilot ? ', flying ' + words(b.pilot, 24) : '') + (b.coop ? ', in co-op' : '') + ', ' + new Date(now).toISOString().replace('T', ' ').slice(0, 16) + ' UTC.\n'
      + (first ? 'The first time anyone has felled it. It is still in the game: nothing takes it away.'
               : 'Felled before by ' + others + ' other account' + (others === 1 ? '' : 's') + '.');
    const p = post(env, text);
    if (ctx && ctx.waitUntil) ctx.waitUntil(p); else await p;
  }
  return reply({ told: true, first });
}

export default async function felled(req, env, ctx) {
  if (req.method !== 'GET' && req.method !== 'POST') return nothing();
  if (req.method === 'POST' && !originOk(req)) return nothing();
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return nothing();
  const admin = s.account.perks.includes('dev');
  if (req.method === 'GET') {
    if (!admin) return nothing();
    await ensureFelled(env.DB);
    const res = await env.DB.prepare(
      `SELECT f.mod, f.boss, f.name, f.who, f.first, f.last, f.times, f.info, f.seen,
              (f.first = (SELECT MIN(g.first) FROM felled g WHERE g.mod = f.mod AND g.boss = f.boss)) AS firstEver
         FROM felled f ORDER BY f.seen, f.last DESC LIMIT 200`).all();
    const list = ((res && res.results) || []).map(r => {
      let info = {};
      try { info = JSON.parse(r.info || '{}') || {}; } catch (e) {}
      return { mod: r.mod, boss: r.boss, name: r.name, who: r.who, first: r.first, last: r.last, times: r.times,
               info, seen: !!r.seen, firstEver: !!r.firstEver };
    });
    return reply({ felled: list });
  }
  // a JSON body, and a small one: a cross-site form can declare neither
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return nothing();
  let b = null;
  try { const text = await req.text(); b = text.length <= 1024 ? JSON.parse(text) : null; } catch (e) { b = null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return reply({ error: 'bad request' }, 400);
  if ('seen' in b) {
    if (!admin) return nothing();
    const upTo = Number(b.seen);
    if (!Number.isFinite(upTo)) return reply({ error: 'bad request' }, 400);
    await ensureFelled(env.DB);
    const r = await env.DB.prepare('UPDATE felled SET seen = 1 WHERE seen = 0 AND last <= ?1').bind(upTo).run();
    return reply({ seen: (r && r.meta && r.meta.changes) || 0 });
  }
  return told(req, env, ctx, s, b);
}
