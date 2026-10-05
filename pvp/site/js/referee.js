/* ===========================================================================
   VOIDRUNNER PvP — this machine's word to the referee (PVP-PLAN.md, Phase 5)

   The server's Match object (pvp/src/objects.js) decides what a match comes
   to from both machines' reports; this is one machine's side of that.

     open     a friend's match: the host opens it before its room, so the
              match's id can ride to the guest in the game's own hello
     join     the guest, on that hello, joins it as itself
     take     a queued match: the queue made it, both sides in it, and the
              lobby handed this machine its id and side (match.js)
     code     a queued match's room: the host leaves its code with the
              match, the guest asks for it
     tick     every five seconds of play (from the frame, so a hidden tab
              falls quiet as its game stalls): the lockstep fingerprints made
              since the last report, whether the game ever parted, whether
              the link is gone, and whether the match broke its rules (a
              ranked host's start flying what the server did not allow)
     finish   the result, the moment the match is decided, and every report
              after it until the verdict comes back

   Nothing here decides anything, and nothing waits on it: a match plays the
   same whether or not the referee can be reached.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  const EVERY = 5000;            // ms between reports
  const AFTER = 3 * 60 * 1000;   // and how long to keep asking for the verdict once it is over or alone
  const R = M.ref = { id: null, side: -1, verdict: null, onVerdict: null, live: false, broke: false,
                      result: null, parted: false, sent: -1, epoch: -1, next: 0, busy: false, done: false, until: 0 };

  async function api(body) {
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 8000) : 0;
    try {
      const r = await fetch('/api/pvp/match', {
        method: 'POST', credentials: 'same-origin', keepalive: true, signal: ctl ? ctl.signal : undefined,
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return await r.json();
    } catch (e) {
      return null;
    } finally { if (ctl) clearTimeout(t); }
  }

  // the host, before it opens its room; a slow or absent referee holds it up four seconds at most
  R.open = async pilot => {
    const d = await Promise.race([api({ op: 'open', kind: 'friend', pilot }),
                                  new Promise(res => setTimeout(() => res(null), 4000))]);
    if (d && typeof d.id === 'string' && d.side === 0) { R.id = d.id; R.side = 0; }
  };

  // a queued match: already made, with this machine in it
  R.take = match => { R.id = match.id; R.side = match.side; };
  // its room's code: left by the host (`code`), asked for by the guest; null until there is one
  R.code = async code => {
    if (!R.id) return null;
    const d = await api(code ? { op: 'code', id: R.id, code } : { op: 'code', id: R.id });
    return d && d.ok ? d : null;
  };

  // the hello: the host's carries the match, and the guest joins it
  const hello = M.hello, peerHello = M.peerHello;
  M.hello = () => Object.assign(hello(), R.side === 0 && R.id ? { match: R.id } : {});
  M.peerHello = d => {
    peerHello(d);
    if (!M.hand || M.hand.role !== 'guest' || R.id || !d || typeof d.match !== 'string' || !/^[0-9a-f]{32}$/.test(d.match)) return;
    R.id = d.match;
    // kept, so whatever waits on this side being in the match can (mode.js: a hidden pilot's code)
    R.joining = api({ op: 'join', id: d.match, pilot: M.hand.pilot }).then(r => {
      if (r && r.side === 1) R.side = 1;
      else R.id = null;                    // no referee for this one: it plays all the same
    });
  };

  /* What this machine says now. `left`: this player is quitting mid-match,
     its last word, sent even with a report in flight. The game hangs up
     before it gets here (quitToMenu), so a quitter is not "alone": it left. */
  function report(left) {
    if (!R.id || R.side < 0 || !R.live || R.done || (R.busy && !left)) return;
    if (LS.epoch !== R.epoch) { R.epoch = LS.epoch; R.sent = -1; }
    const fps = [];
    for (const [t, h] of LS.ckMine) if (t > R.sent && fps.length < 60) fps.push([LS.epoch, t, h >>> 0]);
    if (fps.length) R.sent = fps[fps.length - 1][1];
    R.parted = R.parted || LS.resyncs > 0;
    const alone = !left && !(LS.on && MP.on);
    if ((alone || R.result) && !R.until) R.until = Date.now() + AFTER;
    R.busy = true;
    api({ op: 'report', id: R.id, report: { fps, parted: R.parted, alone, left: !!left, broke: R.broke, tick: LS.tick, result: R.result } }).then(d => {
      R.busy = false;
      if (d && d.verdict) {
        R.verdict = d.verdict; R.done = true;
        if (R.onVerdict) R.onVerdict(d.verdict);
      }
    });
  }

  // once a frame (match.js): a report every five seconds
  R.tick = () => {
    if (!R.id || R.done) return;
    /* Nothing to say until the game is on: a long wait for a friend is
       nobody leaving, and a link that never forms is nobody's fault. */
    if (LS.on && MP.on) R.live = true;
    if (!R.live) return;
    const now = Date.now();
    if (R.until && now > R.until) { R.done = true; return; }
    if (R.busy || now < R.next) return;     // one at a time; a result waits only for the one in flight
    R.next = now + EVERY;
    report();
  };
  // the match is decided (rounds.js, phase 'over'): say so now, and keep saying it
  R.finish = m => {
    if (R.result) return;
    R.result = { winner: m.winner, score: [m.score[0], m.score[1]], bestOf: m.bestOf };
    R.next = 0;
    R.tick();
  };
  /* This player is leaving, and says so as it goes (keepalive outlives the
     page): `quit`, mid-match, is a forfeit; otherwise (the other side went,
     or it is over) its last word lets the referee see who went first. */
  R.stop = quit => {
    if (!R.done) report(quit === true);
    R.done = true;
  };
})();
