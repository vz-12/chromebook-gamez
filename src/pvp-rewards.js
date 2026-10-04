/* ===========================================================================
   PvP's season rewards, as the game's Worker hands them out (PVP-PLAN.md,
   Phase 5 step 4 and Phase 6 step 2). The PvP Worker files them at the
   season's turn (pvp/src/seasons.js): a ranked podium (pvp_podiums) and a
   badge for the league each placed player finished in (pvp_badges). This
   side reads them, for the game's awards (leaderboard.js, ?awards) and for
   profiles (profiles.js).

   Here, in src/, rather than beside the filing in pvp/: the game's Worker
   redeploys on src/ changes and not on pvp/ ones, so what a reward is worth
   has to live where filling it in reaches the game.

   What each is worth is cosmetics (banners, profile decals, skins: Phase 7,
   not built yet). Until then the tables below are empty, and a podium or a
   badge still shows on the player's profile.
   ========================================================================= */

// each place on a season's ranked podium: the game's own shipped skin and perk ids
export const PODIUM_REWARDS = {
  1: { skins: [], perks: [] },
  2: { skins: [], perks: [] },
  3: { skins: [], perks: [] }
};
// each league a season can be finished in
export const BADGE_REWARDS = {
  bronze: { skins: [], perks: [] },
  silver: { skins: [], perks: [] },
  gold: { skins: [], perks: [] },
  platinum: { skins: [], perks: [] },
  void: { skins: [], perks: [] }
};

const tableThere = async (db, name) => {
  const r = await db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table' AND name = ?1").bind(name).first();
  return !!(r && r.n);
};

// an account's PvP podiums, newest season first; none before the PvP Worker has filed any
export async function podiumsOf(db, acct) {
  if (!(await tableThere(db, 'pvp_podiums'))) return [];
  return ((await db.prepare(
    'SELECT season, queue, rank, rating, league FROM pvp_podiums WHERE account = ?1 ORDER BY season DESC, rank ASC')
    .bind(acct).all()).results || []).map(r => ({ season: r.season, queue: r.queue, rank: r.rank, rating: Math.round(r.rating), league: r.league }));
}

// an account's league badges, newest season first
export async function badgesOf(db, acct) {
  if (!(await tableThere(db, 'pvp_badges'))) return [];
  return ((await db.prepare(
    'SELECT season, queue, league, rating FROM pvp_badges WHERE account = ?1 ORDER BY season DESC')
    .bind(acct).all()).results || []).map(r => ({ season: r.season, queue: r.queue, league: r.league, rating: Math.round(r.rating) }));
}

/* Both, as entries in the game's awards list. Their own shapes on purpose:
   the game reads { season, rank } as one of its own season podiums (its
   crowns), so a PvP podium is { pvp: {...} } and a badge { pvpBadge: {...} },
   which the game passes by. Whatever each is worth follows as plain grants. */
export async function pvpAwards(db, acct) {
  const out = [];
  const grant = (give, via) => {
    for (const id of (give && give.skins) || []) out.push({ skin: id, via });
    for (const id of (give && give.perks) || []) out.push({ perk: id, via });
  };
  for (const p of await podiumsOf(db, acct)) {
    const via = 'PVP ' + p.season + ' #' + p.rank;
    out.push({ pvp: p, via });
    grant(PODIUM_REWARDS[p.rank], via);
  }
  for (const b of await badgesOf(db, acct)) {
    const via = 'PVP ' + b.season + ' ' + String(b.league).toUpperCase();
    out.push({ pvpBadge: b, via });
    grant(Object.prototype.hasOwnProperty.call(BADGE_REWARDS, b.league) ? BADGE_REWARDS[b.league] : null, via);
  }
  return out;
}
