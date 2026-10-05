/* ===========================================================================
   VOIDRUNNER — profile looks (PVP-PLAN.md, Phase 7 part 1)

   What a player's profile wears: a banner (the cover across the top), a
   picture (the emblem half over it) and decals (small badges in a row
   under the name). The user, 5 Oct 2026: "we need gates to be able to
   switch out banners and profile pictures, along with profile decals that
   we can grant server-side."

     GET /api/account/look            -> { account, look, items }   signed in
     PUT /api/account/look { banner, picture, decals }  -> { look }
         picks only what the account owns; anything else is refused
   and a profile (/api/boards?user=, profiles.js) carries its look.

   LOOKS below is the catalog: every item, its name and its gate. The server
   alone decides who owns what; the page (leaderboard/) only draws the ids
   it is handed (art.js: profileBanner, avatar, decal).

   GATES, the language an item's `gate` is written in:
     'free'               every account
     'grant'              nobody, unless given it by hand
     'pilot:<id>'         that pilot unlocked
     'awake:<id>'         that pilot awakened; 'awake:any' for any of them
     'runs:<n>'           at least n runs flown
     'podium'             on a season's podium, on the game's boards
     'pvp-league:<id>'    finished a PvP season in that league or higher
     'pvp-podium'         on a PvP season's ranked podium
   A gate this file does not know opens for nobody. Whatever its gate, an
   item can also be given by hand (look_grants, `npm run grant`), and an
   account with the 'dev' perk owns every one.

   A pick is checked against what the account owns when it is saved and
   again whenever it is shown, so taking a grant back takes it off the
   profile on its next view (the default shows in its place).
   ========================================================================= */
import { ensureAuth, sessionOf, originOk } from './auth.js';
import { STORE, ARCHIVE } from './season.js';
import { getStore } from './store.js';
import { PILOTS, BASE_PILOTS, LEAGUES } from '../pvp/src/rules.js';
import { podiumsOf, badgesOf } from './pvp-rewards.js';

export const KINDS = ['banner', 'picture', 'decal'];
export const MAX_DECALS = 4;

// the catalog. Ids are the art's (leaderboard/art.js draws each by its id); names are shown
export const LOOKS = {
  banner: [
    { id: 'world',     n: 'YOUR WORLD',  gate: 'free' },
    { id: 'runner',    n: 'VOIDRUNNER',  gate: 'pilot:runner' },
    { id: 'ember',     n: 'EMBER',       gate: 'pilot:ember' },
    { id: 'hacker',    n: 'THE HACKER',  gate: 'pilot:hacker' },
    { id: 'vagrant',   n: 'THE VAGRANT', gate: 'pilot:melee' },
    { id: 'overdrive', n: 'OVERDRIVE',   gate: 'awake:ember' },
    { id: 'superuser', n: 'SUPERUSER',   gate: 'awake:hacker' },
    { id: 'ronin',     n: 'RONIN',       gate: 'awake:melee' },
    { id: 'crown',     n: 'THE CROWN',   gate: 'podium' },
    { id: 'ladder',    n: 'THE LADDER',  gate: 'pvp-league:gold' }
  ],
  picture: [
    { id: 'sigil',     n: 'SIGIL',       gate: 'free' },
    { id: 'runner',    n: 'VOIDRUNNER',  gate: 'pilot:runner' },
    { id: 'ember',     n: 'EMBER',       gate: 'pilot:ember' },
    { id: 'hacker',    n: 'THE HACKER',  gate: 'pilot:hacker' },
    { id: 'vagrant',   n: 'THE VAGRANT', gate: 'pilot:melee' },
    { id: 'overdrive', n: 'OVERDRIVE',   gate: 'awake:ember' },
    { id: 'superuser', n: 'SUPERUSER',   gate: 'awake:hacker' },
    { id: 'ronin',     n: 'RONIN',       gate: 'awake:melee' },
    { id: 'bronze',    n: 'BRONZE',      gate: 'pvp-league:bronze' },
    { id: 'silver',    n: 'SILVER',      gate: 'pvp-league:silver' },
    { id: 'gold',      n: 'GOLD',        gate: 'pvp-league:gold' },
    { id: 'platinum',  n: 'PLATINUM',    gate: 'pvp-league:platinum' },
    { id: 'void',      n: 'VOID',        gate: 'pvp-league:void' }
  ],
  decal: [
    { id: 'founder',   n: 'FOUNDER',     gate: 'grant' },
    { id: 'tester',    n: 'TESTER',      gate: 'grant' },
    { id: 'champion',  n: 'CHAMPION',    gate: 'grant' },
    { id: 'developer', n: 'DEVELOPER',   gate: 'grant' },
    { id: 'crown',     n: 'SEASON PODIUM', gate: 'podium' },
    { id: 'duelist',   n: 'PVP PODIUM',  gate: 'pvp-podium' },
    { id: 'veteran',   n: 'VETERAN',     gate: 'runs:100' },
    { id: 'awakened',  n: 'AWAKENED',    gate: 'awake:any' }
  ]
};
// what every profile wears until its player picks something else
export const DEFAULT_LOOK = { banner: 'world', picture: 'sigil', decals: [] };

const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const BY = Object.fromEntries(KINDS.map(k => [k, new Map(LOOKS[k].map(it => [it.id, it]))]));
export const itemOf = (kind, id) => (hasOwn(BY, kind) && typeof id === 'string' && BY[kind].get(id)) || null;
const LEAGUE_AT = Object.fromEntries(LEAGUES.map((l, i) => [l.id, i]));
const pilotName = id => (hasOwn(PILOTS, id) ? PILOTS[id] : String(id).toUpperCase());
const leagueName = id => (LEAGUES.find(l => l.id === id) || { n: String(id).toUpperCase() }).n;

/* ------------------------------- the facts --------------------------------
   Everything the gates ask about one account, read once: its perks, its
   unlocks and runs (the save), its podiums on the game's boards and in
   PvP, the best league it has finished a PvP season in, and its grants. */

// the game's season podiums an account's profiles stood on (profiles.js shows them too)
export async function gamePodiums(db, env, acct) {
  const pids = new Set(((await db.prepare('SELECT pid FROM account_pids WHERE account = ?1').bind(acct).all()).results || [])
    .map(r => r.pid));
  const out = [];
  if (!pids.size) return out;
  const doc = await getStore(env, STORE).get(ARCHIVE, { type: 'json' }).catch(() => null);
  for (const [id, s] of Object.entries((doc && doc.list) || {}))
    for (const e of (s && s.top3) || [])
      if (e && e.pid && pids.has(e.pid)) out.push({ season: id, rank: e.rank, score: e.score });
  out.sort((x, y) => (x.season < y.season ? 1 : x.season > y.season ? -1 : x.rank - y.rank));
  return out;
}

export async function factsOf(db, env, acct, perks) {
  const f = { dev: Array.isArray(perks) && perks.includes('dev'), pilots: new Set(BASE_PILOTS), awake: new Set(),
              runs: 0, podiums: 0, league: -1, pvpPodiums: 0, granted: new Map() };
  const save = await db.prepare("SELECT unlocks, json_extract(data, '$.runs') AS runs FROM saves WHERE account = ?1")
    .bind(acct).first().catch(() => null);
  if (save) {
    let u = null;
    try { u = JSON.parse(save.unlocks); } catch (e) {}
    for (const id of (u && Array.isArray(u.chars) ? u.chars : [])) f.pilots.add(id);
    for (const id of (u && Array.isArray(u.awake) ? u.awake : [])) if (f.pilots.has(id)) f.awake.add(id);
    f.runs = Number.isFinite(Number(save.runs)) ? Math.max(0, Math.floor(Number(save.runs))) : 0;
  }
  for (const g of ((await db.prepare('SELECT item, why, at FROM look_grants WHERE account = ?1').bind(acct).all()).results || []))
    f.granted.set(g.item, { why: g.why || '', at: g.at });
  f.podiums = (await gamePodiums(db, env, acct)).length;
  f.pvpPodiums = (await podiumsOf(db, acct)).length;
  for (const b of await badgesOf(db, acct)) if (hasOwn(LEAGUE_AT, b.league)) f.league = Math.max(f.league, LEAGUE_AT[b.league]);
  return f;
}

/* ------------------------------- the gates -------------------------------- */
function gateOpen(gate, f) {
  if (gate === 'free') return true;
  const at = String(gate).indexOf(':'), k = at < 0 ? gate : gate.slice(0, at), v = at < 0 ? '' : gate.slice(at + 1);
  switch (k) {
    case 'pilot': return f.pilots.has(v);
    case 'awake': return v === 'any' ? f.awake.size > 0 : f.awake.has(v);
    case 'runs': return /^\d+$/.test(v) && f.runs >= Number(v);
    case 'podium': return f.podiums > 0;
    case 'pvp-league': return hasOwn(LEAGUE_AT, v) && f.league >= LEAGUE_AT[v];
    case 'pvp-podium': return f.pvpPodiums > 0;
    default: return false;                    // 'grant', and anything unknown
  }
}
// what opens a locked item, as the page says it
function gateLock(gate, f) {
  const at = String(gate).indexOf(':'), k = at < 0 ? gate : gate.slice(0, at), v = at < 0 ? '' : gate.slice(at + 1);
  switch (k) {
    case 'grant': return 'GIVEN BY THE TEAM';
    case 'pilot': return 'UNLOCK ' + pilotName(v);
    case 'awake': return v === 'any' ? 'AWAKEN A PILOT' : 'AWAKEN ' + pilotName(v);
    case 'runs': return 'FLY ' + v + ' RUNS · ' + Math.min(f.runs, Number(v)) + ' SO FAR';
    case 'podium': return 'FINISH A SEASON IN THE TOP 3';
    case 'pvp-league': return 'FINISH A PVP SEASON IN ' + leagueName(v) + (v === 'void' ? '' : ' OR HIGHER');
    case 'pvp-podium': return 'FINISH A PVP SEASON IN THE TOP 3';
    default: return 'NOT YET AVAILABLE';
  }
}
// why an owned item is owned, for a decal's tooltip on the profile
function gateEarned(gate) {
  const at = String(gate).indexOf(':'), k = at < 0 ? gate : gate.slice(0, at), v = at < 0 ? '' : gate.slice(at + 1);
  switch (k) {
    case 'pilot': return pilotName(v) + ' UNLOCKED';
    case 'awake': return v === 'any' ? 'A PILOT AWAKENED' : pilotName(v) + ' AWAKENED';
    case 'runs': return v + ' RUNS FLOWN';
    case 'podium': return 'A SEASON IN THE TOP 3';
    case 'pvp-league': return 'A PVP SEASON IN ' + leagueName(v) + (v === 'void' ? '' : ' OR HIGHER');
    case 'pvp-podium': return 'A PVP SEASON IN THE TOP 3';
    default: return '';
  }
}

export function owns(kind, id, f) {
  const it = itemOf(kind, id);
  return !!it && (f.dev || f.granted.has(kind + ':' + id) || gateOpen(it.gate, f));
}
// the catalog as this account sees it: every item, owned or not, and what opens it
export function catalogFor(f) {
  const out = {};
  for (const kind of KINDS) out[kind] = LOOKS[kind].map(it => {
    const g = f.granted.get(kind + ':' + it.id), own = owns(kind, it.id, f);
    const o = { id: it.id, n: it.n, owned: own };
    if (!own) o.lock = gateLock(it.gate, f);
    else if (g) o.why = g.why || 'GIVEN BY THE TEAM';
    else if (!f.dev || gateOpen(it.gate, f)) { const e = gateEarned(it.gate); if (e) o.why = e; }
    return o;
  });
  return out;
}

/* The picks, as they may be shown: each one the account still owns, or the
   default in its place; decals in the order picked, each once, at most
   MAX_DECALS. */
export function cleanLook(row, f) {
  const banner = row && owns('banner', row.banner, f) ? row.banner : DEFAULT_LOOK.banner;
  const picture = row && owns('picture', row.picture, f) ? row.picture : DEFAULT_LOOK.picture;
  let list = [];
  try { list = row ? JSON.parse(row.decals) : []; } catch (e) {}
  const decals = [...new Set(Array.isArray(list) ? list : [])].filter(id => owns('decal', id, f)).slice(0, MAX_DECALS);
  return { banner, picture, decals };
}
const lookRow = (db, acct) => db.prepare('SELECT banner, picture, decals FROM looks WHERE account = ?1').bind(acct).first();

// a profile's look, for anyone to see: the picks, and each decal's name and why
export async function publicLook(db, env, acct, perks) {
  const f = await factsOf(db, env, acct, perks);
  const look = cleanLook(await lookRow(db, acct), f);
  const cat = catalogFor(f).decal;
  return { banner: look.banner, picture: look.picture,
           decals: look.decals.map(id => { const it = cat.find(c => c.id === id); return { id, n: it.n, why: it.why || '' }; }) };
}

/* -------------------------------- the route -------------------------------- */
function reply(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
}
const no = (error, status, extra) => reply(Object.assign({ error }, extra), status);

export default async (req, env) => {
  const db = env.DB;
  await ensureAuth(db);
  if (req.method !== 'GET' && req.method !== 'PUT') return no('method not allowed', 405);
  if (req.method === 'PUT' && !originOk(req)) return no('bad origin', 403);
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return no('signed out', 401);
  const acct = s.account.id, f = await factsOf(db, env, acct, s.account.perks);

  if (req.method === 'GET')
    return reply({ account: s.account.name, look: cleanLook(await lookRow(db, acct), f), items: catalogFor(f), maxDecals: MAX_DECALS });

  // the picks: JSON only (a cross-site form cannot send it), each one owned
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return no('bad request', 415);
  const text = await req.text();
  if (text.length > 2048) return no('bad request', 413);
  let b;
  try { b = JSON.parse(text); } catch (e) { return no('bad request', 400); }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return no('bad request', 400);
  const cur = cleanLook(await lookRow(db, acct), f);
  const banner = b.banner === undefined ? cur.banner : b.banner;
  const picture = b.picture === undefined ? cur.picture : b.picture;
  const decals = b.decals === undefined ? cur.decals : b.decals;
  if (!itemOf('banner', banner) || !itemOf('picture', picture)) return no('no such look', 400);
  if (!Array.isArray(decals) || decals.length > MAX_DECALS || new Set(decals).size !== decals.length || !decals.every(id => itemOf('decal', id)))
    return no('bad decals', 400, { max: MAX_DECALS });
  const notOwned = [['banner', banner], ['picture', picture], ...decals.map(id => ['decal', id])].filter(([k, id]) => !owns(k, id, f));
  if (notOwned.length) return no('not yours', 403, { items: notOwned.map(([k, id]) => k + ':' + id) });
  await db.prepare(`INSERT INTO looks (account, banner, picture, decals, updated) VALUES (?1, ?2, ?3, ?4, ?5)
                    ON CONFLICT (account) DO UPDATE SET banner = excluded.banner, picture = excluded.picture,
                      decals = excluded.decals, updated = excluded.updated`)
    .bind(acct, banner, picture, JSON.stringify(decals), Date.now()).run();
  return reply({ look: { banner, picture, decals } });
};
