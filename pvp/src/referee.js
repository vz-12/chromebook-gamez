/* ===========================================================================
   THE REFEREE — what a match's two reports add up to (PVP-PLAN.md, Phase 5).

   Pure rules, no platform: the Match Durable Object (objects.js) keeps the
   state and the clock, and asks here what it means. The tests drive these
   functions directly as well as through the Worker.

   Both machines run the same lockstep game, both pilots on each, from both
   players' inputs. Each reports, every few seconds:
     fps      its fingerprints of the game: [epoch, step, hash], one a second
              (the lockstep checks it already makes, LS.ckMine)
     parted   its game and the other's ever disagreed (the safety net fired)
     alone    its link to the other is gone
     left     this player quit mid-match (its last word, on the way out)
     result   at the end: the winner (0 the host, 1 the guest) and the score

   A modified client changes only its own copy of the game, which parts from
   the honest one: the honest side sees it and says so, and the match is no
   contest. Nobody can claim a win the other machine did not also see.
   ========================================================================= */

export const REF = {
  GRACE: 45 * 1000,          // quiet this long mid-match, while the other stays: a forfeit
  OPEN_TTL: 30 * 60 * 1000,  // a friend's match nobody joined is let go after this
  MAX_MATCH: 45 * 60 * 1000, // and one that never ends, after this
  KEEP: 10 * 60 * 1000,      // a verdict is kept this long for late reports, then the object empties
  MAX_FPS: 60,               // fingerprints in one report (five seconds' worth, with room)
  KEEP_FPS: 400              // and kept per side, to compare with the other's
};

const int = (v, lo, hi) => Number.isInteger(v) && v >= lo && v <= hi;

/* A report's body, as only what the rules read: anything else is dropped,
   and a malformed part is refused rather than half read. */
export function cleanReport(b) {
  if (!b || typeof b !== 'object') return null;
  const out = { fps: [], parted: b.parted === true, alone: b.alone === true, left: b.left === true, result: null,
                tick: int(b.tick, 0, 1e9) ? b.tick : 0 };
  if (b.fps !== undefined) {
    if (!Array.isArray(b.fps) || b.fps.length > REF.MAX_FPS) return null;
    for (const f of b.fps) {
      if (!Array.isArray(f) || f.length !== 3 || !int(f[0], 0, 0xffff) || !int(f[1], 0, 1e9) || !int(f[2], 0, 0xffffffff)) return null;
      out.fps.push([f[0], f[1], f[2]]);
    }
  }
  if (b.result !== undefined && b.result !== null) {
    const r = b.result;
    if (!r || (r.winner !== 0 && r.winner !== 1) || !Array.isArray(r.score) || r.score.length !== 2
        || !int(r.score[0], 0, 9) || !int(r.score[1], 0, 9) || (r.bestOf !== 3 && r.bestOf !== 5)) return null;
    // a result must be one: the winner has the rounds to have won it
    const need = Math.ceil(r.bestOf / 2);
    if (r.score[r.winner] !== need || r.score[1 - r.winner] >= need) return null;
    out.result = { winner: r.winner, score: [r.score[0], r.score[1]], bestOf: r.bestOf };
  }
  return out;
}

// a fresh side of a match: who, flying what, and what it has said
export const newSide = (acct, name, pilot, now) =>
  ({ acct, name, pilot, seen: now, fps: {}, order: [], result: null, parted: false, alone: false, left: false, tick: 0 });

/* One side's report, into the match: when it was last heard from, its
   fingerprints (each held up against the other side's for the same step),
   and what it says. Returns the match. */
export function take(m, side, rep, now) {
  const me = m.sides[side], other = m.sides[1 - side];
  me.seen = now;
  me.tick = Math.max(me.tick, rep.tick);
  if (rep.parted) me.parted = true;
  if (rep.left) me.left = true;
  me.alone = rep.alone;
  if (rep.result && !me.result) me.result = rep.result;
  for (const [epoch, step, hash] of rep.fps) {
    const key = epoch + ':' + step;
    if (Object.prototype.hasOwnProperty.call(me.fps, key)) continue;
    me.fps[key] = hash;
    me.order.push(key);
    if (me.order.length > REF.KEEP_FPS) delete me.fps[me.order.shift()];
    if (other && Object.prototype.hasOwnProperty.call(other.fps, key) && other.fps[key] !== hash && !m.mismatch)
      m.mismatch = { key, hashes: side === 0 ? [hash, other.fps[key]] : [other.fps[key], hash] };
  }
  return m;
}

const sameResult = (a, b) => a.winner === b.winner && a.score[0] === b.score[0] && a.score[1] === b.score[1];

/* What the match comes to, now, or null while it is still being played.
     played     the result stands (both saw it, or the other went quiet after,
                or never said and the match ran out its time)
     forfeit    one side quit, or went quiet mid-match while the other stayed
     void       no contest: the games parted, the fingerprints or the results
                disagree, or both lost the link; both sides are flagged
     abandoned  both went quiet, or it never ended: nothing to record
     expired    nobody joined: nothing to record */
export function decide(m, now) {
  if (m.verdict) return null;
  const [A, B] = m.sides;
  if (!B) return now - m.created > REF.OPEN_TTL ? { v: 'expired', reason: 'nobody joined' } : null;
  const flag = reason => ({ v: 'void', reason, flag: [0, 1] });
  if (m.mismatch) return flag('fingerprints');
  if (A.parted || B.parted) return flag('parted');
  if (A.result && B.result)
    return sameResult(A.result, B.result)
      ? { v: 'played', winner: A.result.winner, score: A.result.score, bestOf: A.result.bestOf }
      : flag('results');
  const quiet = s => now - s.seen > REF.GRACE;
  if (A.result || B.result) {
    const [r, other] = A.result ? [A.result, B] : [B.result, A];
    /* The other was there to the end and left without saying: the one result
       stands. So it does if the other keeps reporting and never says, once
       the match has run out its time: holding a loss back only delays it. */
    return quiet(other) || now - m.started > REF.MAX_MATCH
      ? { v: 'played', winner: r.winner, score: r.score, bestOf: r.bestOf, reason: 'one result' } : null;
  }
  // a player who quits says so on the way out: a forfeit, at once
  if (A.left !== B.left) return { v: 'forfeit', winner: A.left ? 1 : 0, reason: 'quit' };
  if (A.alone && B.alone) return flag('dropped');
  const qa = quiet(A), qb = quiet(B);
  if (qa && qb) {
    /* Both gone by now. If one went while the other stayed and saw it go
       (the other's last word: alone, and later), the one who went first
       forfeits, as it would have had the other stayed out the grace. */
    if (B.alone && !A.alone && A.seen < B.seen) return { v: 'forfeit', winner: 1, reason: 'left' };
    if (A.alone && !B.alone && B.seen < A.seen) return { v: 'forfeit', winner: 0, reason: 'left' };
    return { v: 'abandoned', reason: 'both quiet' };
  }
  if (qa || qb) return { v: 'forfeit', winner: qa ? 1 : 0, reason: 'left' };
  if (now - m.started > REF.MAX_MATCH) return { v: 'abandoned', reason: 'too long' };
  return null;
}

// when the match should next be looked at, if nobody reports before then
export function nextLook(m, now) {
  if (m.verdict) return m.verdict.at + REF.KEEP;
  const [A, B] = m.sides;
  if (!B) return m.created + REF.OPEN_TTL + 1000;
  return Math.max(now + 1000, Math.min(Math.min(A.seen, B.seen) + REF.GRACE + 1000, m.started + REF.MAX_MATCH + 1000));
}

// a verdict worth a row in pvp_matches
export const recorded = v => v === 'played' || v === 'forfeit' || v === 'void';
