/* ===========================================================================
   PvP's rules, as tables (PVP-PLAN.md, Phases 4 and 6): a new league or a new
   kind of play is a line here, not code.

   Ranked puts everybody in a league by rating. The low leagues fly the base
   pilots only, never awake; from platinum up everything goes. Reward upgrades
   count in every league. A ranked match is best of three below gold and best
   of five from there (bestOf). The cutoffs are placeholders until there are
   real matches to tune them on (PVP-PLAN.md, still open).
   ========================================================================= */

/* The game's pilots, by the ids its save uses (CHARS in index.html). A pilot
   added to the game is added here too, until Phase 3 lets PvP read the
   game's own table. */
export const PILOTS = { runner: 'VOIDRUNNER', ember: 'EMBER', hacker: 'THE HACKER', melee: 'THE VAGRANT' };
// the two with nothing to unlock
export const BASE_PILOTS = ['runner', 'ember'];

export const LEAGUES = [
  { id: 'bronze',   n: 'BRONZE',   from: 0,    pilots: 'base', awake: false, bestOf: 3 },
  { id: 'silver',   n: 'SILVER',   from: 1200, pilots: 'base', awake: false, bestOf: 3 },
  { id: 'gold',     n: 'GOLD',     from: 1500, pilots: 'base', awake: false, bestOf: 5 },
  { id: 'platinum', n: 'PLATINUM', from: 1800, pilots: 'own',  awake: true,  bestOf: 5 },
  { id: 'void',     n: 'VOID',     from: 2100, pilots: 'own',  awake: true,  bestOf: 5 }
];

// casual: everything the account has unlocked, awake included; a match with a friend is best of three
export const CASUAL = { id: 'casual', n: 'CASUAL', pilots: 'own', awake: true, bestOf: 3 };

/* The queues matchmaking runs (Phase 5 step 2), one Matchmaker each. Ranked
   is rated (Glicko-2, per season) and played by league; casual is neither,
   and flies whatever each player owns. Phase 6: who may enter (`entry`,
   the gates in gates.js) and what a finished season pays (`rewards`, filed
   by seasons.js). */
export const QUEUES = {
  ranked: { id: 'ranked', n: 'RANKED', rated: true, leagues: true,
            entry: ['signedIn', 'accountAge:24h', 'runs:10'],
            rewards: ['seasonPodium', 'leagueBadge'] },
  casual: { id: 'casual', n: 'CASUAL', rated: false, leagues: false,
            entry: ['signedIn'],
            rewards: [] }
};

/* A new player's first ranked matches place them: until PLACEMENTS are
   played their league is not shown, and they fly the lowest league's rules. */
export const PLACEMENTS = 5;

/* A player's league from their ranked rating row (pvp_ratings), or the
   lowest, provisional, before they have one or while still being placed. */
export function leagueOf(row) {
  if (!row || row.games < PLACEMENTS) return Object.assign({}, LEAGUES[0], { provisional: true, left: PLACEMENTS - (row ? row.games : 0) });
  let lg = LEAGUES[0];
  for (const l of LEAGUES) if (row.rating >= l.from) lg = l;
  return Object.assign({}, lg, { provisional: false, left: 0 });
}

/* Leagues whose rules fly the same pilots the same way: a ticket is only
   ever paired inside its own, since its pilot was picked before the queue. */
export const bracketOf = rule => rule.pilots + (rule.awake ? '+awake' : '');

// two leagues met in ranked: the match is played to the lower one's rules
export const lowerLeague = (a, b) =>
  LEAGUES[Math.min(LEAGUES.findIndex(l => l.id === a), LEAGUES.findIndex(l => l.id === b))] || LEAGUES[0];

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
