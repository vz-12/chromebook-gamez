/* ===========================================================================
   PvP's rules, as tables (PVP-PLAN.md, Phases 4 and 6): a new league or a new
   kind of play is a line here, not code.

   Ranked puts everybody in a league by rating. The low leagues fly the base
   pilots only, never awake; from platinum up everything goes. Reward upgrades
   count in every league. The cutoffs are placeholders until there are real
   matches to tune them on (PVP-PLAN.md, still open).
   ========================================================================= */

/* The game's pilots, by the ids its save uses (CHARS in index.html). A pilot
   added to the game is added here too, until Phase 3 lets PvP read the
   game's own table. */
export const PILOTS = { runner: 'VOIDRUNNER', ember: 'EMBER', hacker: 'THE HACKER', melee: 'THE VAGRANT' };
// the two with nothing to unlock
export const BASE_PILOTS = ['runner', 'ember'];

export const LEAGUES = [
  { id: 'bronze',   n: 'BRONZE',   from: 0,    pilots: 'base', awake: false },
  { id: 'silver',   n: 'SILVER',   from: 1200, pilots: 'base', awake: false },
  { id: 'gold',     n: 'GOLD',     from: 1500, pilots: 'base', awake: false },
  { id: 'platinum', n: 'PLATINUM', from: 1800, pilots: 'own',  awake: true },
  { id: 'void',     n: 'VOID',     from: 2100, pilots: 'own',  awake: true }
];

// casual: everything the account has unlocked, awake included
export const CASUAL = { id: 'casual', n: 'CASUAL', pilots: 'own', awake: true };

/* What a player may bring under a rule: the pilots, which of them may fly
   awake, and the reward upgrades. `unlocks` is the summary the account's save
   carries (src/account.js), or null before its first save. */
export function loadout(rule, unlocks) {
  const u = unlocks || {};
  const list = v => (Array.isArray(v) ? v : []);
  const own = new Set([...BASE_PILOTS, ...list(u.chars)]);
  const pilots = Object.keys(PILOTS)
    .filter(id => (rule.pilots === 'base' ? BASE_PILOTS.includes(id) : own.has(id)));
  const awake = rule.awake ? pilots.filter(id => list(u.awake).includes(id)) : [];
  return { pilots, awake, ups: list(u.ups).slice() };
}
