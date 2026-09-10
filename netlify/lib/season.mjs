/* ===========================================================================
   SEASONS — the arithmetic, and the rollover.

   Shared by the API function and by the scheduled one that closes the board
   whether or not anybody is playing. It lives here so there is exactly one
   copy of the rule about when a season ends; two would drift, and the day
   they drifted is the day a season closed twice or not at all.

   Deliberately free of any Netlify import: the caller hands in a store. That
   is what lets the tests drive it with a fake one, and it means this module
   has no opinion about where it is running.
   ========================================================================= */
export const STORE = 'voidrunner-leaderboard';
export const KEY = 'top';
export const RETRIES = 6;

/* A season runs from the 6th to the 6th, UTC, and is named for the month it
   opens in: '2026-09' opens 6 Sep and closes 6 Oct. The 6th rather than the
   1st is deliberate — a reset on the 1st lands on New Year's Day, and a board
   that turns over during the one week of the year everybody is playing is a
   board that throws away its best month. */
export const SEASON_DAY = 6;
export const META = 'meta';            // { current: '<season>' }
export const ARCHIVE = 'seasons';      // { list: { '<season>': { top3, closedAt } } }
export const seasonKey = id => 'season:' + id;
export const isSeason = v => typeof v === 'string' && /^\d{4}-\d{2}$/.test(v);

export function seasonOf(t = Date.now()) {
  const d = new Date(t);
  let y = d.getUTCFullYear(), m = d.getUTCMonth();
  if (d.getUTCDate() < SEASON_DAY) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
  return y + '-' + String(m + 1).padStart(2, '0');
}
export function seasonStart(id) {
  const [y, m] = id.split('-').map(Number);
  return Date.UTC(y, m - 1, SEASON_DAY);
}
export function seasonEnd(id) {
  const [y, m] = id.split('-').map(Number);
  return Date.UTC(y, m, SEASON_DAY);           // the 6th of the following month
}
export const seasonAfter = id => seasonOf(seasonEnd(id));

/* Files a finished season's top three. Only writes when that season has no
   record yet, so a second closer adds nothing and destroys nothing — which is
   what makes it safe for every request to attempt the close. */
export async function closeSeason(store, id) {
  for (let i = 0; i < RETRIES; i++) {
    const res = await store.getWithMetadata(ARCHIVE, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    const list = (res && res.data && res.data.list) || {};
    if (list[id]) return;                              // already filed
    const board = await store.get(seasonKey(id), { type: 'json' }).catch(() => null);
    const top3 = ((board && board.entries) || []).slice(0, 3).map((e, i) => ({
      rank: i + 1, name: e.name, score: e.score, wave: e.wave, pid: e.pid || null
    }));
    list[id] = { top3, closedAt: Date.now() };
    const opts = res && res.etag ? { onlyIfMatch: res.etag } : { onlyIfNew: true };
    const wrote = await store.setJSON(ARCHIVE, { list }, opts)
      .catch(() => ({ modified: false }));
    if (wrote && wrote.modified) return;
  }
}

/* The rollover. Lazy by necessity: a function only exists while a request is
   in flight, so there is nobody to notice midnight on the 6th except the next
   caller. It walks forward one season at a time rather than jumping, so a
   month nobody played still gets closed and filed (empty) instead of being
   skipped — the archive stays a continuous record. */
export async function ensureSeason(store) {
  const now = seasonOf();
  for (let i = 0; i < 24; i++) {
    const res = await store.getWithMetadata(META, { type: 'json', consistency: 'strong' })
      .catch(() => null);
    if (!res || !res.data || !isSeason(res.data.current)) {
      // first request this store has ever seen: adopt today, close nothing
      await store.setJSON(META, { current: now, since: Date.now() }).catch(() => {});
      return now;
    }
    const cur = res.data.current;
    if (cur === now) return now;
    // a pointer ahead of the clock means somebody else's skew, not our cue
    if (seasonStart(cur) > seasonStart(now)) return now;
    await closeSeason(store, cur);
    await store.setJSON(META, { current: seasonAfter(cur), since: Date.now() },
                        { onlyIfMatch: res.etag }).catch(() => ({ modified: false }));
    // whether that landed or another request got there first, re-read and see
  }
  return now;
}
