/* ===========================================================================
   VOIDRUNNER — the season closer, on a clock.

   The board turns over on the 6th whether or not anybody is playing.

   The API function still closes a due season on the first request that notices
   it, and that stays as the backstop. But a backstop is not a schedule: with
   no traffic the finished season simply stayed up, and "the season ended when
   somebody happened to open the page" is not an ending. Worse, the first
   player back would be the one who triggered it, which meant the board they
   saw depended on how quickly they loaded.

   DAILY, NOT MONTHLY, on purpose. ensureSeason only does anything when the
   season has actually changed, so twenty-nine of these thirty runs read one
   small blob and stop. The thirtieth does the close within minutes of
   midnight. A monthly cron would be a single point of failure once a month:
   miss it to a deploy, a cold start or an outage and the board stays stale
   until traffic saves it. Missing a daily costs a day at worst, and the next
   run picks it up.

   It is safe to run beside a request doing the same thing. The close is
   idempotent — it files a season only if that season has no record yet — and
   the pointer moves under compare-and-swap, so whichever of them loses the
   swap re-reads and finds the work already done.
   ========================================================================= */
import { getStore } from '@netlify/blobs';
import { STORE, META, ensureSeason, seasonOf } from '../lib/season.mjs';

export default async () => {
  const store = getStore({ name: STORE, consistency: 'strong' });

  // what the store thought before, purely so the log says whether it acted
  const was = await store.get(META, { type: 'json' }).catch(() => null);
  const before = (was && was.current) || null;

  const now = await ensureSeason(store);
  const closed = before && before !== now;

  console.log(closed
    ? 'season closed: ' + before + ' -> ' + now
    : 'nothing due (season ' + now + ')');

  return new Response(JSON.stringify({ ok: true, season: now, closed: !!closed,
                                       previous: before }),
                      { headers: { 'content-type': 'application/json' } });
};

/* 00:05 UTC every day. Five past rather than on the hour: seasons are keyed on
   a UTC date, and starting a few minutes after midnight keeps the run clear of
   the boundary it is there to cross. */
export const config = { schedule: '5 0 * * *' };
