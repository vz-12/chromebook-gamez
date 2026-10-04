/* ===========================================================================
   PvP's season podiums, as the game's Worker hands them out (PVP-PLAN.md,
   Phase 5 step 4). The PvP Worker files them at the season's turn
   (pvp/src/seasons.js, into pvp_podiums); this side reads them, for the
   game's awards (leaderboard.js, ?awards) and for profiles (profiles.js).

   Here, in src/, rather than beside the filing in pvp/: the game's Worker
   redeploys on src/ changes and not on pvp/ ones, so what a podium is worth
   (PODIUM_REWARDS) has to live where filling it in reaches the game.
   ========================================================================= */

/* What each place in a season's ranked podium is worth, handed out with the
   game's awards as plain grants: the game's own shipped skin and perk ids.
   Empty until decided: a podium still shows on the player's profile. */
export const PODIUM_REWARDS = {
  1: { skins: [], perks: [] },
  2: { skins: [], perks: [] },
  3: { skins: [], perks: [] }
};

// an account's PvP podiums, newest season first; none before the PvP Worker has filed any
export async function podiumsOf(db, acct) {
  const has = await db.prepare(
    "SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = 'pvp_podiums'").first();
  if (!has || !has.n) return [];
  return ((await db.prepare(
    'SELECT season, queue, rank, rating, league FROM pvp_podiums WHERE account = ?1 ORDER BY season DESC, rank ASC')
    .bind(acct).all()).results || []).map(r => ({ season: r.season, queue: r.queue, rank: r.rank, rating: Math.round(r.rating), league: r.league }));
}

/* The same, as entries in the game's awards list. Their own shape on
   purpose: the game reads { season, rank } as one of its own season podiums
   (its crowns), so a PvP one is { pvp: {...} }, which the game passes by.
   Whatever the place is worth follows as plain grants. */
export async function podiumAwards(db, acct) {
  const out = [];
  for (const p of await podiumsOf(db, acct)) {
    const via = 'PVP ' + p.season + ' #' + p.rank;
    out.push({ pvp: p, via });
    const give = PODIUM_REWARDS[p.rank] || { skins: [], perks: [] };
    for (const id of give.skins) out.push({ skin: id, via });
    for (const id of give.perks) out.push({ perk: id, via });
  }
  return out;
}
