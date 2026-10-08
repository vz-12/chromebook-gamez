/* ===========================================================================
   VOIDRUNNER — Patreon links (the user, 8 Oct 2026: "how do we get a
   supporter's account name without asking directly?")

   A signed-in player links their Patreon to their account themselves, and
   Patreon says whether they support the game. Nobody types a name. A
   linked account whose pledge to the campaign is SUPPORTER_CENTS or more
   holds the 'supporter' gate (looks.js), the same as one flagged by hand
   with `npm run supporter`.

     GET  /api/patreon/link   signed in: off to Patreon's "allow?" screen,
                              with a one-time state bound to this session
     GET  /api/patreon/back   Patreon sends the player back here: the state
                              checked, the code traded for a token, the
                              player's membership read, the link kept, and
                              the player on to their profile, told how it
                              went (/leaderboard/?patreon=<how>#u/<name>)
     POST /api/patreon/hook   Patreon's webhook, signed with the webhook's
                              secret: a pledge made, changed or ended
     GET  /api/patreon        signed in: { linked, supporter, flagged }
     POST /api/patreon { op: 'unlink' }   signed in: forget the link

   What is kept: Patreon's user id beside the account, and whether that user
   supports the game now. Not the token (used once, then dropped), not a
   name, not an email. The scope asked for is `identity` alone, which shows
   only the player's membership of this campaign, never what else they
   support (Patreon's docs).

   The secrets (wrangler secret put): PATREON_CLIENT_ID and
   PATREON_CLIENT_SECRET, the app's (patreon.com/portal, Clients & API
   Keys), and PATREON_WEBHOOK_SECRET, the webhook's. Without the first two
   the link answers that it is off; without the third the webhook refuses.

   The return address must be registered on the app exactly as BACK lists
   it. Only voidrunner.online's is: Patreon is blocked on the school
   networks the workers.dev address is for, so a link started there is told
   to use voidrunner.online (and is not sent there). Registering the school
   address on the app and adding it to BACK opens it there too.
   ========================================================================= */
import { createHmac, timingSafeEqual, randomBytes } from 'node:crypto';
import { Buffer } from 'node:buffer';
import { ensureAuth, sessionOf, originOk, sha256 } from './auth.js';

export const CAMPAIGN = '16924738';          // patreon.com/VOIDRUNNER
export const SUPPORTER_CENTS = 100;          // the $1 tier, or more
const STATE_MS = 10 * 60 * 1000;             // a trip to Patreon and back
const BACK = { 'voidrunner.online': 'https://voidrunner.online/api/patreon/back' };
const AUTHORIZE = 'https://www.patreon.com/oauth2/authorize';
const TOKEN = 'https://www.patreon.com/api/oauth2/token';
const IDENTITY = 'https://www.patreon.com/api/oauth2/v2/identity'
  + '?include=memberships,memberships.campaign&fields%5Bmember%5D=patron_status,currently_entitled_amount_cents';
const UA = 'VOIDRUNNER (voidrunner.online)';

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const reply = (body, status = 200) => new Response(JSON.stringify(body),
  { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const no = (error, status) => reply({ error }, status);
const away = to => new Response(null, { status: 302, headers: { location: to, 'cache-control': 'no-store' } });
// the player's profile, told how the link went
const done = (req, how, name) =>
  away(new URL('/leaderboard/?patreon=' + how + (name ? '#u/' + encodeURIComponent(name) : ''), req.url).href);

// a membership, as Patreon words it, to the one question asked of it
export const supports = m => !!m && m.patron_status === 'active_patron'
  && Number(m.currently_entitled_amount_cents) >= SUPPORTER_CENTS;

/* Whether the account holds the gate by its link (looks.js asks; a table a
   database has not made yet reads as no link). */
export async function linkedSupporter(db, acct) {
  const row = await db.prepare('SELECT active FROM patreon_links WHERE account = ?1').bind(acct).first().catch(() => null);
  return !!(row && row.active);
}

/* Patreon, asked as the player: the token for the code, then who they are
   and their membership of the campaign. Null on any failure. */
async function patreonUser(env, code, back) {
  const t = await fetch(TOKEN, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', 'user-agent': UA },
    body: new URLSearchParams({ code, grant_type: 'authorization_code', client_id: env.PATREON_CLIENT_ID,
                                client_secret: env.PATREON_CLIENT_SECRET, redirect_uri: back })
  }).then(r => (r.ok ? r.json() : null)).catch(() => null);
  if (!t || typeof t.access_token !== 'string') return null;
  const me = await fetch(IDENTITY, { headers: { authorization: 'Bearer ' + t.access_token, 'user-agent': UA } })
    .then(r => (r.ok ? r.json() : null)).catch(() => null);
  const id = me && me.data && me.data.type === 'user' ? String(me.data.id || '') : '';
  if (!/^\d{1,20}$/.test(id)) return null;
  const member = (Array.isArray(me.included) ? me.included : []).find(x => x && x.type === 'member'
    && x.relationships && x.relationships.campaign && x.relationships.campaign.data
    && String(x.relationships.campaign.data.id) === CAMPAIGN);
  return { id, member: member ? member.attributes || {} : null };
}

// one account per Patreon user: linking it again elsewhere moves it
function keep(db, acct, patreon, m, now) {
  return db.batch([
    db.prepare('DELETE FROM patreon_links WHERE patreon = ?1 AND account != ?2').bind(patreon, acct),
    db.prepare(`INSERT INTO patreon_links (account, patreon, active, status, cents, linked, checked)
                VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)
                ON CONFLICT (account) DO UPDATE SET patreon = excluded.patreon, active = excluded.active,
                  status = excluded.status, cents = excluded.cents, linked = excluded.linked, checked = excluded.checked`)
      .bind(acct, patreon, supports(m) ? 1 : 0, m ? String(m.patron_status || '') : '',
            m ? Math.max(0, Math.floor(Number(m.currently_entitled_amount_cents) || 0)) : 0, now)
  ]);
}

/* -------------------------------- the routes -------------------------------- */
async function link(req, env) {
  const host = new URL(req.url).hostname;
  if (!hasOwn(BACK, host)) return done(req, 'elsewhere');
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return done(req, 'signedout');
  if (!env.PATREON_CLIENT_ID || !env.PATREON_CLIENT_SECRET) return done(req, 'off', s.account.name);
  const state = randomBytes(24).toString('base64url'), now = Date.now();
  // one trip at a time per account, and none left over from anybody's old ones
  await env.DB.batch([
    env.DB.prepare('DELETE FROM patreon_states WHERE account = ?1 OR expires <= ?2').bind(s.account.id, now),
    env.DB.prepare('INSERT INTO patreon_states (id, account, expires) VALUES (?1, ?2, ?3)').bind(sha256(state), s.account.id, now + STATE_MS)
  ]);
  const to = new URL(AUTHORIZE);
  to.search = new URLSearchParams({ response_type: 'code', client_id: env.PATREON_CLIENT_ID, redirect_uri: BACK[host],
                                    scope: 'identity', state }).toString();
  return away(to.href);
}

async function back(req, env) {
  const u = new URL(req.url), host = u.hostname;
  if (!hasOwn(BACK, host)) return done(req, 'elsewhere');
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return done(req, 'signedout');
  const state = u.searchParams.get('state') || '', code = u.searchParams.get('code') || '';
  // the state is spent whatever happens next, and good only for the session's own account
  const held = state && state.length <= 100
    ? await env.DB.prepare('DELETE FROM patreon_states WHERE id = ?1 RETURNING account, expires').bind(sha256(state)).first()
    : null;
  if (!held || held.account !== s.account.id || held.expires <= Date.now()) return done(req, 'expired', s.account.name);
  if (u.searchParams.get('error')) return done(req, 'denied', s.account.name);
  if (!env.PATREON_CLIENT_ID || !env.PATREON_CLIENT_SECRET) return done(req, 'off', s.account.name);
  if (!code || code.length > 512) return done(req, 'failed', s.account.name);
  const who = await patreonUser(env, code, BACK[host]);
  if (!who) return done(req, 'failed', s.account.name);
  await keep(env.DB, s.account.id, who.id, who.member, Date.now());
  return done(req, supports(who.member) ? 'linked' : 'notpatron', s.account.name);
}

/* Patreon's webhook. The body is signed: the hex HMAC-MD5 of it, keyed by
   the webhook's secret, in X-Patreon-Signature. It carries the member, and
   through it the Patreon user, whose link (if there is one) follows what it
   says; a pledge deleted, or the member, ends it at once. A user nobody has
   linked changes nothing and is not written down. */
async function hook(req, env) {
  if (req.method !== 'POST') return no('method not allowed', 405);
  if (!env.PATREON_WEBHOOK_SECRET) return no('off', 503);
  const body = await req.text();
  if (body.length > 65536) return no('too large', 413);
  const sig = String(req.headers.get('x-patreon-signature') || '').toLowerCase();
  const want = createHmac('md5', env.PATREON_WEBHOOK_SECRET).update(body).digest('hex');
  if (!/^[0-9a-f]{32}$/.test(sig) || !timingSafeEqual(Buffer.from(sig), Buffer.from(want))) return no('bad signature', 401);
  let d = null;
  try { d = JSON.parse(body).data; } catch (e) {}
  const rel = d && d.relationships, user = rel && rel.user && rel.user.data, camp = rel && rel.campaign && rel.campaign.data;
  if (!d || d.type !== 'member' || !user || !/^\d{1,20}$/.test(String(user.id))) return no('bad body', 400);
  if (camp && String(camp.id) !== CAMPAIGN) return reply({ ok: true, skipped: 'another campaign' });
  const event = String(req.headers.get('x-patreon-event') || '');
  const m = d.attributes || {};
  const ended = event === 'members:pledge:delete' || event === 'members:delete';
  const on = !ended && supports(m);
  const r = await env.DB.prepare('UPDATE patreon_links SET active = ?1, status = ?2, cents = ?3, checked = ?4 WHERE patreon = ?5')
    .bind(on ? 1 : 0, ended ? 'ended' : String(m.patron_status || ''),
          ended ? 0 : Math.max(0, Math.floor(Number(m.currently_entitled_amount_cents) || 0)), Date.now(), String(user.id)).run();
  return reply({ ok: true, linked: !!(r && r.meta && r.meta.changes) });
}

async function mine(req, env) {
  if (req.method !== 'GET' && req.method !== 'POST') return no('method not allowed', 405);
  if (req.method === 'POST' && !originOk(req)) return no('bad origin', 403);
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return no('signed out', 401);
  const db = env.DB, acct = s.account.id;
  if (req.method === 'POST') {
    if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return no('bad request', 415);
    let b = null;
    try { b = JSON.parse(await req.text()); } catch (e) {}
    if (!b || b.op !== 'unlink') return no('bad request', 400);
    await db.prepare('DELETE FROM patreon_links WHERE account = ?1').bind(acct).run();
  }
  const row = await db.prepare('SELECT active FROM patreon_links WHERE account = ?1').bind(acct).first();
  return reply({ linked: !!row, supporter: !!(row && row.active), flagged: s.account.perks.includes('supporter'),
                 on: !!(env.PATREON_CLIENT_ID && env.PATREON_CLIENT_SECRET) });
}

export default async (req, env) => {
  await ensureAuth(env.DB);
  const path = new URL(req.url).pathname;
  if (path === '/api/patreon/hook') return hook(req, env);
  if (path === '/api/patreon') return mine(req, env);
  if (req.method !== 'GET') return no('method not allowed', 405);
  return path === '/api/patreon/link' ? link(req, env) : back(req, env);
};
