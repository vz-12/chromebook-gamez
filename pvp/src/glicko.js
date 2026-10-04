/* ===========================================================================
   GLICKO-2 — a rating, how sure it is, and how steady the player is
   (PVP-PLAN.md, Phase 5 step 2). Pure arithmetic, no platform.

   Mark Glickman's "Example of the Glicko-2 system" (2012), step by step, on
   the usual 1500 scale. Each ranked match is its own rating period: one
   result against one opponent, taken at both players' ratings from before
   it. scripts/pvp.mjs checks this against the paper's own worked example.

     rating   the estimate (1500 to start)
     rd       how unsure it is (350 to start; it shrinks with every match)
     vol      how erratic the player is (0.06 to start)
   ========================================================================= */
const SCALE = 173.7178;    // between Glicko's scale and Glicko-2's
const TAU = 0.5;           // how fast volatility may move: Glickman suggests 0.3 to 1.2
const EPS = 1e-6;
export const START = { rating: 1500, rd: 350, vol: 0.06 };
const RD_MIN = 30, RD_MAX = 350;

const g = phi => 1 / Math.sqrt(1 + 3 * phi * phi / (Math.PI * Math.PI));
const E = (mu, muj, phij) => 1 / (1 + Math.exp(-g(phij) * (mu - muj)));

/* One player, after a period's results: [{ rating, rd, s }], s being 1 for a
   win, 0 for a loss, 0.5 for a draw. With no results only the doubt grows. */
export function glicko2(p, results) {
  const mu = (p.rating - 1500) / SCALE, phi = p.rd / SCALE, sigma = p.vol;
  if (!results.length) {
    const rd = Math.min(RD_MAX, Math.sqrt(phi * phi + sigma * sigma) * SCALE);
    return { rating: p.rating, rd, vol: sigma };
  }
  // step 3 and 4: the estimated variance, and the improvement
  let vInv = 0, d = 0;
  for (const r of results) {
    const muj = (r.rating - 1500) / SCALE, phij = r.rd / SCALE, e = E(mu, muj, phij), gj = g(phij);
    vInv += gj * gj * e * (1 - e);
    d += gj * (r.s - e);
  }
  const v = 1 / vInv, delta = v * d;
  // step 5: the new volatility (the Illinois algorithm)
  const a = Math.log(sigma * sigma);
  const f = x => {
    const ex = Math.exp(x), den = phi * phi + v + ex;
    return ex * (delta * delta - phi * phi - v - ex) / (2 * den * den) - (x - a) / (TAU * TAU);
  };
  let A = a, B;
  if (delta * delta > phi * phi + v) B = Math.log(delta * delta - phi * phi - v);
  else {
    let k = 1;
    while (f(a - k * TAU) < 0) k++;
    B = a - k * TAU;
  }
  let fA = f(A), fB = f(B);
  for (let i = 0; i < 100 && Math.abs(B - A) > EPS; i++) {
    const C = A + (A - B) * fA / (fB - fA), fC = f(C);
    if (fC * fB <= 0) { A = B; fA = fB; } else fA /= 2;
    B = C; fB = fC;
  }
  const vol = Math.exp(A / 2);
  // steps 6 to 8: the new deviation and rating, back on the usual scale
  const phiStar = Math.sqrt(phi * phi + vol * vol);
  const phiNew = 1 / Math.sqrt(1 / (phiStar * phiStar) + 1 / v);
  const muNew = mu + phiNew * phiNew * d;
  return {
    rating: muNew * SCALE + 1500,
    rd: Math.min(RD_MAX, Math.max(RD_MIN, phiNew * SCALE)),
    vol
  };
}

// a match between two: both new ratings, each from the other's rating before it
export function rateMatch(a, b, aWon) {
  return [glicko2(a, [{ rating: b.rating, rd: b.rd, s: aWon ? 1 : 0 }]),
          glicko2(b, [{ rating: a.rating, rd: a.rd, s: aWon ? 0 : 1 }])];
}
