/* ===========================================================================
   VOIDRUNNER PvP — on air: this machine's fight, to its relay (live
   spectating, step 2)

   A match with a hidden pilot in it can be watched by anybody (watch.js):
   their own copy of the game plays the fight from the fighters' inputs. This
   is the other end. The machine flying the hidden pilot holds both pilots'
   input for every step it plays, and sends it to the match's relay
   (pvp/src/broadcast.js, through /api/pvp/watch):

     head    once the run has begun: the match as the server made it (with
             no account in it), the run's start as lockstep's header has it
             (LS.head), both players' handshakes (MP.said, MP.heard), the
             build
     in      every half second: the steps played since, the host's record
             and the guest's for each (lsWrite), with the game's own
             fingerprints among them
     snap    every fifteen seconds of the fight, and whenever this machine's
             game is put back in step (a new epoch): the whole of it
             (snapWrite), at a step's end, as lockstep's resync takes one
     end     the match is over for this machine: the step, and the result, or
             with none, which side walked out

   Only this side, and only the account allowed: the relay checks, and a
   machine flying one of the game's own pilots never sends at all. Nothing
   here waits on the relay, and nothing it answers changes the match: if the
   relay cannot be reached, its viewers wait, and the match plays on under
   its own rules.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  const AIR = M.AIR = {
    EVERY: 500,            // ms between batches
    SNAP: 15 * 60,         // steps between snapshots
    MOST: 600,             // steps in one batch, at most (the relay's KEEP.STEPS)
    RETRY: 3000            // ms before a send that could not reach the relay is tried again
  };
  /* recs[t]: step t's two records, as they go on the wire (null once the
     relay has them); sent: the first step the relay does not have yet. */
  const A = M.air = { on: false, run: -1, head: null, headed: false, recs: [], fps: new Map(), next: 0, sent: 0,
                      epoch: 0, snaps: [], ended: null, endSent: false, busy: false, at: 0, flushAt: 0, off: '' };

  const b64 = bytes => {
    let s = '';
    for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  };

  // the pilot this machine flies is from outside the game: the side that goes on air
  const mineHidden = () => { const p = pilotP(pilotMine()); return !!(p && p.outside); };

  // a run of a match begins, with this machine the one to send it
  function begin() {
    const q = M.hand.match;
    Object.assign(A, { on: true, run: LS.run, side: pilotMine(), headed: false, recs: [], next: 0, sent: 0, epoch: LS.epoch, snaps: [],
                       ended: null, endSent: false, busy: false, at: 0, flushAt: 0, off: '' });
    A.fps.clear();
    A.head = {
      v: 1, build: buildId(), pilot: pilotP(pilotMine()).charId,
      // the match as the server made it (a queued one): its rules and both sides, never an account or this machine's side
      match: q && Array.isArray(q.sides) ? { queue: q.queue, rated: !!q.rated, league: q.league || null, bestOf: q.bestOf, sides: q.sides } : null,
      run: LS.head,
      hellos: MP.role === 'host' ? [MP.said, MP.heard] : [MP.heard, MP.said]   // the host's, then the guest's
    };
  }

  // the fight at this step, whole: as lockstep's resync writes it (lsResync)
  function snap() {
    const mine = state;
    if (LS.paused) state = 'pause';          // the shared state, not a screen this machine has open over it
    let json = null;
    try {
      const s = snapWrite();
      s.ls = { paused: LS.paused, pausedBy: LS.pausedBy };
      json = JSON.stringify(s);
    } catch (e) { console.error('on air: a snapshot', e); }
    finally { state = mine; }
    if (json) A.snaps.push({ at: LS.tick, epoch: LS.epoch, json });
  }

  /* A step of the shared game, just played (lsPlay): its two records kept,
     and the fingerprint lockstep took at its end, if it took one. A step
     played again after a snapshot was taken over (lsAdopt) is not new. */
  M.played = (cur, t) => {
    if (!M.hand || M.hand.mode !== 'match') return;
    if (t === 0 && LS.run !== A.run) {
      if (M.ref && M.ref.id && mineHidden() && LS.head && MP.said && MP.heard) begin();
      else { A.on = false; A.run = LS.run; }
    }
    if (!A.on || A.ended || LS.run !== A.run || t !== A.next) return;
    wSeek(0); lsWrite(cur.host); lsWrite(cur.wing);
    A.recs[t] = new Uint8Array(wOut());
    A.next = t + 1;
    const h = LS.ckMine.get(LS.tick);
    if (h !== undefined) A.fps.set(LS.tick, [LS.epoch, LS.tick, h >>> 0]);
    if (LS.epoch !== A.epoch || LS.tick % AIR.SNAP === 0) { A.epoch = LS.epoch; snap(); }
  };

  async function send(body, keepalive) {
    try {
      const r = await fetch('/api/pvp/watch', {
        method: 'POST', credentials: 'same-origin', keepalive: !!keepalive, headers: { 'content-type': 'application/json' },
        body: JSON.stringify(Object.assign({ match: M.ref.id }, body)) });
      let d = null;
      try { d = await r.json(); } catch (e) {}
      return { status: r.status, d };
    } catch (e) { return { status: 0, d: null }; }
  }

  // the steps the relay does not have yet, from where it says, as one batch
  function batch() {
    const from = A.sent, n = Math.min(A.next - from, AIR.MOST);
    let size = 0;
    for (let s = from; s < from + n; s++) size += A.recs[s].length;
    const bytes = new Uint8Array(size);
    for (let s = from, at = 0; s < from + n; s++) { bytes.set(A.recs[s], at); at += A.recs[s].length; }
    const fps = [];
    for (const [k, f] of A.fps) if (k > from && k <= from + n) fps.push(f);
    return { op: 'in', from, n, recs: b64(bytes), fps };
  }

  // what goes next, if anything is due: the header, the steps, each snapshot once the steps before it are in, the end
  function due(now) {
    if (!A.headed) return { op: 'head', head: A.head, build: A.head.build };
    if (A.snaps.length && A.snaps[0].at <= A.sent) { const s = A.snaps[0]; return { op: 'snap', at: s.at, epoch: s.epoch, json: s.json }; }
    if (A.sent < A.next && (now >= A.flushAt || A.next - A.sent >= AIR.MOST || A.ended)) return batch();
    if (A.ended && !A.endSent && A.sent >= A.next) return { op: 'end', at: A.ended.at, result: A.ended.result, left: A.ended.left };
    return null;
  }

  function heard(body, status, d) {
    if (status === 200) {
      if (body.op === 'head') A.headed = true;
      else if (body.op === 'snap') A.snaps.shift();
      else if (body.op === 'in') {
        const next = d && Number.isInteger(d.next) ? d.next : body.from + body.n;
        for (let s = A.sent; s < next; s++) A.recs[s] = null;
        for (const k of A.fps.keys()) if (k <= next) A.fps.delete(k);
        A.sent = next;
        A.flushAt = Date.now() + AIR.EVERY;
      } else if (body.op === 'end') { A.endSent = true; A.on = false; }
    } else if (status === 409 && d && Number.isInteger(d.need) && d.need <= A.next && A.recs[d.need] !== null) {
      A.sent = d.need;                       // the relay has less than this machine thought: from there again
    } else if (status === 400 || status === 401 || status === 403 || status === 413) {
      A.off = (d && d.error) || String(status);
      console.error('on air: the relay refused this match: ' + A.off);
    } else A.at = Date.now() + AIR.RETRY;    // unreachable: its viewers wait, and it is tried again shortly
  }

  // once a frame, whatever screen is up: the end noticed, and the next thing sent
  function tick() {
    if (!A.on) return;
    if (!A.ended) {
      const m = typeof RUN !== 'undefined' && RUN.pvp;
      if (m && m.run === A.run && m.phase === 'over') A.ended = { at: A.next, result: { winner: m.winner, score: [m.score[0], m.score[1]] } };
      // over by somebody leaving: the other side, since this one leaves through M.leave (below)
      else if (!LS.on || LS.run !== A.run) A.ended = { at: A.next, result: null, left: 1 - A.side };
    }
    const now = Date.now();
    if (A.busy || A.off || now < A.at) return;
    const body = due(now);
    if (!body) return;
    A.busy = true;
    send(body).then(({ status, d }) => { A.busy = false; heard(body, status, d); });
  }
  const frame = M.frame;
  M.frame = () => { frame(); tick(); };

  /* Leaving the page: what is left goes with it, as a page's last words do
     (keepalive outlives the page), so its viewers see the end. */
  const leave = M.leave;
  M.leave = () => {
    if (A.on && A.headed && !A.off) {
      if (!A.ended) A.ended = { at: A.next, result: null, left: A.side };   // this side walking out of a match still on
      if (A.sent < A.next) send(batch(), true);
      send({ op: 'end', at: A.ended.at, result: A.ended.result, left: A.ended.left }, true);
      A.on = false;
    }
    leave();
  };
})();
