/* ===========================================================================
   VOIDRUNNER PvP — the ad suggestion (PVP-PLAN.md, Phase 6 step 3).
   GROUNDWORK: off until PVP_ADS.client is filled in, and until then nothing
   is loaded, shown or asked for.

   An offer, never a break (user, 4 Oct): in PLAY A FRIEND, "watch a short ad
   and your next friend match starts with 2 more upgrades". Only friend
   matches (an ad before an online match would feel forced), only when an
   ad is ready, and only if the player asks. The player can close the ad
   at any time; they just don't get the bonus.

   Google's Ad Placement API, its rewarded placement (adBreak type 'reward'):
     beforeReward(showAdFn)  an ad is ready: show the offer; showAdFn plays it
     adViewed                watched to the end: the bonus is earned
     adDismissed             closed early: no bonus, no penalty
     adBreakDone             always, last: the offer is taken down
   The ad is Google's to pick. Ask for short, skippable ones in AdSense when
   the site is approved; nothing here can play one that runs on.

   The bonus waits in this tab (sessionStorage) for the next friend match
   and goes with it in the play page's hand (pvp.js, take). The engine
   accepts only PVP_ADS.bonus and only in a friend match (rounds.js,
   ROUNDS.adBonus), and both players' games agree on it through the hello.
   It is the browser's word: no web ad can be verified by a server, and a
   friend match is unrated.

   To switch it on: PvP's address approved in AdSense (it is its own site:
   voidrunner-pvp.play101.workers.dev), the H5 games ads (Ad Placement API)
   enabled for it, then the publisher id below. `test: true` shows Google's
   test ads while trying it out. The game's audience is young: set the
   site's child-directed treatment in AdSense before going live.
   ========================================================================= */
(() => {
  'use strict';
  const PVP_ADS = {
    client: '',               // the AdSense publisher id (the game's: 'ca-pub-3461416270406814'); empty: off
    name: 'friend-bonus',     // the placement's name in AdSense's reports
    test: false,              // Google's test ads (data-adbreak-test), for trying it out
    bonus: 2                  // upgrades a watched ad adds to the start of the next friend match
  };
  const KEY = 'vr_pvp_bonus';
  const store = {
    get() { try { return sessionStorage.getItem(KEY) === '1'; } catch (e) { return false; } },
    set(on) { try { if (on) sessionStorage.setItem(KEY, '1'); else sessionStorage.removeItem(KEY); } catch (e) {} }
  };

  const A = window.PvpAds = {
    config: PVP_ADS,
    on: false,                // the provider is loaded
    show: null,               // while an ad is ready: plays it (the offer's button)
    ui: null,                 // the lobby's: { offer(ready), earned(), skipped() }

    // the lobby, once loaded: load the provider and ask for a rewarded ad
    start(ui) {
      A.ui = ui || null;
      if (!PVP_ADS.client || A.on) return false;
      A.on = true;
      const s = document.createElement('script');
      s.async = true;
      s.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      s.setAttribute('data-ad-client', PVP_ADS.client);
      if (PVP_ADS.test) s.setAttribute('data-adbreak-test', 'on');
      s.onerror = () => { A.on = false; };          // blocked or offline: the offer never shows
      document.head.appendChild(s);
      window.adsbygoogle = window.adsbygoogle || [];
      const push = o => window.adsbygoogle.push(o);
      A.adBreak = push; A.adConfig = push;
      push({ preloadAdBreaks: 'on', sound: 'on', onReady: () => A.ask() });
      return true;
    },

    // a rewarded ad, if one is ready; the offer shows only then
    ask() {
      if (!A.on || A.pending()) return;
      A.adBreak({
        type: 'reward',
        name: PVP_ADS.name,
        beforeReward: showAdFn => { A.show = showAdFn; if (A.ui) A.ui.offer(true); },
        adViewed: () => { store.set(true); if (A.ui) A.ui.earned(); },
        adDismissed: () => { if (A.ui) A.ui.skipped(); },
        adBreakDone: () => { A.show = null; if (A.ui) A.ui.offer(false); }
      });
    },

    // the offer's button
    watch() { const f = A.show; A.show = null; if (typeof f === 'function') f(); },

    // a watched ad not yet spent
    pending: () => store.get(),
    // the next friend match takes it (its hand's bonus), once
    take() {
      if (!store.get()) return 0;
      store.set(false);
      return PVP_ADS.bonus;
    }
  };
})();
