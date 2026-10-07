/* ===========================================================================
   Hidden pilots in PvP (the vault, ../../src/vault.js; OUTSIDE PILOTS in the
   game). A hidden pilot is one whose code is not public: an opaque id, kept
   in the vault, flown only by an account holding its perk ('vault:<id>').

     - only its holders may put it in a match: a friend's (match.js) or ranked
       (queue.js); never casual
     - its opponent's machine has to run it too: GET /api/pvp/pilot hands its
       text to its holders and to the other side of a match it flies in
     - in ranked it is paired with the season's #1 and nobody else (objects.js)
     - its matches are never rated nor recorded (objects.js): no ladder,
       profile or history shows it to anyone who has not faced it
     - once a match it flies in is on air (broadcast.js), everybody watching
       runs it too: from then on its text goes to anyone, signed in or not,
       who names that broadcast (`watch`). This is the moment its code stops
       being secret, and it cannot be otherwise: every viewer's game plays it.

     GET /api/pvp/pilot?id=<id>[&match=<match id>][&watch=<match id>]
         -> the module's text (text/javascript, x-vault-hash), or the 404 a
            missing id gets, to everyone else alike
   ========================================================================= */
import { sessionOf } from '../../src/auth.js';
import { VAULT_ID, vaultIds, vaultList, vaultText, nothing } from '../../src/vault.js';
import { PILOTS } from './rules.js';

// an id that names no pilot of the game's and could be the vault's
export const isHidden = id => typeof id === 'string' && !Object.prototype.hasOwnProperty.call(PILOTS, id) && VAULT_ID.test(id);
// the hidden pilots an account may fly, as they are in the vault: [{ id, h, size, n }]
export const hiddenOf = async (db, account) => (await vaultList(db, account)) || [];
export const mayFly = async (db, account, id) =>
  isHidden(id) && vaultIds(account && account.perks).includes(id) && (await hiddenOf(db, account)).some(x => x.id === id);

export default async function pilot(req, env) {
  if (req.method !== 'GET') return nothing();
  const u = new URL(req.url), id = u.searchParams.get('id') || '', mid = u.searchParams.get('match') || '';
  if (!isHidden(id)) return nothing();
  // a broadcast of a match it flies in: its viewers, whoever they are (broadcast.js, info)
  const wid = u.searchParams.get('watch') || '';
  if (/^[0-9a-f]{32}$/.test(wid) && env.BROADCAST) {
    const res = await env.BROADCAST.get(env.BROADCAST.idFromName(wid)).fetch('https://broadcast/info', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    const d = res.ok ? await res.json().catch(() => null) : null;
    return d && d.on && d.pilot === id ? text(env, id) : nothing();
  }
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return nothing();
  // its holders; or the other side of a match it flies in, asked of that match itself
  let ok = vaultIds(s.account.perks).includes(id);
  if (!ok && /^[0-9a-f]{32}$/.test(mid) && env.MATCH) {
    const res = await env.MATCH.get(env.MATCH.idFromName(mid)).fetch('https://match/peer', {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ acct: s.account.id }) });
    const d = res.ok ? await res.json().catch(() => null) : null;
    ok = !!(d && d.peerPilot === id);
  }
  if (!ok) return nothing();
  return text(env, id);
}

async function text(env, id) {
  const got = await vaultText(env.DB, id);
  if (!got) return nothing();
  return new Response(got.text, {
    headers: { 'content-type': 'text/javascript; charset=utf-8', 'x-vault-hash': got.hash, 'cache-control': 'no-store' } });
}
