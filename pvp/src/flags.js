/* ===========================================================================
   GET /api/pvp/flags — the referee's flags, for review (PVP-PLAN.md, Phase 5
   step 4). Dev accounts only (accounts.perks has 'dev').

   A match the referee found no contest flags both players (pvp_flags): one
   flag proves nothing, because only one of the two changed their game. What
   tells is the same account flagged against many different opponents, so
   the list is ordered by how many different people an account was flagged
   against, then by flags, beside how many matches it has played at all.

     -> { accounts: [{ name, display, flags, opponents, played, reasons: { fingerprints, parted, results, dropped }, last }],
          recent: [{ at, reason, players: [name, name] }] }
   ========================================================================= */
import { sessionOf } from '../../src/auth.js';
import { ensurePvp } from './records.js';

const reply = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });

export default async function flags(req, env) {
  if (req.method !== 'GET') return reply({ error: 'method not allowed' }, 405);
  const s = await sessionOf(req, env, { peek: true });
  if (!s) return reply({ error: 'signed out' }, 401);
  if (!s.account.perks.includes('dev')) return reply({ error: 'dev accounts only' }, 403);
  const db = env.DB;
  await ensurePvp(db);
  const accounts = ((await db.prepare(
    `SELECT a.name, a.display, COUNT(*) AS flags, MAX(f.at) AS last,
            COUNT(DISTINCT CASE WHEN m.a = f.account THEN m.b ELSE m.a END) AS opponents,
            SUM(f.reason = 'fingerprints') AS fingerprints, SUM(f.reason = 'parted') AS parted,
            SUM(f.reason = 'results') AS results, SUM(f.reason = 'dropped') AS dropped,
            (SELECT COUNT(*) FROM pvp_matches x WHERE x.a = f.account OR x.b = f.account) AS played
       FROM pvp_flags f JOIN accounts a ON a.id = f.account LEFT JOIN pvp_matches m ON m.id = f.match
      GROUP BY f.account ORDER BY opponents DESC, flags DESC, last DESC LIMIT 100`).all()).results || [])
    .map(r => ({ name: r.name, display: r.display, flags: r.flags, opponents: r.opponents, played: r.played, last: r.last,
                 reasons: { fingerprints: r.fingerprints || 0, parted: r.parted || 0, results: r.results || 0, dropped: r.dropped || 0 } }));
  const recent = ((await db.prepare(
    `SELECT m.ended AS at, m.reason, oa.display AS a_name, ob.display AS b_name
       FROM pvp_matches m LEFT JOIN accounts oa ON oa.id = m.a LEFT JOIN accounts ob ON ob.id = m.b
      WHERE m.verdict = 'void' ORDER BY m.ended DESC LIMIT 50`).all()).results || [])
    .map(r => ({ at: r.at, reason: r.reason, players: [r.a_name || '?', r.b_name || '?'] }));
  return reply({ accounts, recent });
}
