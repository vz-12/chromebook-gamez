/* ===========================================================================
   Who may enter a queue (PVP-PLAN.md, Phase 6 step 1): each queue's `entry`
   list (rules.js, QUEUES) names gates, and each gate is a check here. A new
   gate is a new entry in ENTRY, and a queue takes it by naming it.

     signedIn         a session (the queue's route asks for one before this)
     accountAge:<n>h  the account is at least that old ('d' for days too)
     runs:<n>         that many runs of the game in the account's save

   Ranked asks a day and ten runs, so a fresh account cannot be thrown into
   the ladder to throw matches; casual asks only to be signed in. Dev
   accounts pass every gate, to test with.
   ========================================================================= */
import { QUEUES } from './rules.js';

const HOUR = 60 * 60 * 1000;
const span = v => {
  const m = /^(\d+)([hd])$/.exec(String(v || ''));
  return m ? Number(m[1]) * (m[2] === 'd' ? 24 : 1) * HOUR : null;
};
const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many);

/* Each gate: (its argument, what is known of the player) -> null to pass,
   or why not, in a sentence the lobby shows as it is. */
export const ENTRY = {
  signedIn: () => null,
  accountAge: (arg, p) => {
    const need = span(arg);
    if (need === null) return 'this queue is misconfigured';
    const left = p.account.created + need - p.now;
    if (left <= 0) return null;
    const h = Math.ceil(left / HOUR);
    return 'opens when your account is ' + (need >= 24 * HOUR && need % (24 * HOUR) === 0 ? plural(need / (24 * HOUR), 'day', 'days') : plural(need / HOUR, 'hour', 'hours'))
      + ' old: in ' + (h >= 48 ? plural(Math.ceil(h / 24), 'day', 'days') : plural(h, 'hour', 'hours'));
  },
  runs: (arg, p) => {
    const need = Number(arg);
    if (!(need > 0)) return 'this queue is misconfigured';
    const left = need - p.runs;
    return left <= 0 ? null : 'opens after ' + plural(need, 'run', 'runs') + ' of VOIDRUNNER: ' + left + ' to go';
  }
};

// the runs in an account's save (src/account.js keeps the game's profile as the save), 0 without one
async function runsOf(db, acct) {
  const row = await db.prepare('SELECT data FROM saves WHERE account = ?1').bind(acct).first();
  if (!row) return 0;
  try { const n = Number(JSON.parse(row.data).runs); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; }
  catch (e) { return 0; }
}

/* Whether this account may enter a queue now: { open, why, gates }, where
   why is the first gate's reason ('RANKED opens after 10 runs…') and gates
   every gate that is shut. */
export async function entryFor(db, account, queue, now = Date.now()) {
  const q = QUEUES[queue];
  if (!q) return { open: false, why: 'no such queue', gates: [] };
  if (Array.isArray(account.perks) && account.perks.includes('dev')) return { open: true, why: null, gates: [], dev: true };
  const p = { account, now, runs: 0 };
  if ((q.entry || []).some(g => g.startsWith('runs:'))) p.runs = await runsOf(db, account.id);
  const shut = [];
  for (const g of q.entry || []) {
    const [name, arg] = g.split(':');
    const check = Object.prototype.hasOwnProperty.call(ENTRY, name) ? ENTRY[name] : null;
    const why = check ? check(arg, p) : 'this queue is misconfigured';
    if (why) shut.push({ gate: g, why });
  }
  return { open: !shut.length, why: shut.length ? q.n + ' ' + shut[0].why : null, gates: shut };
}
