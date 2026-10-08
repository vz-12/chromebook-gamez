/* ===========================================================================
   THE LEADERBOARD'S ART — every picture on /leaderboard/ is drawn here.

   leaderboard.js decides what is on the page and when; this file decides
   how it looks. It is the page's art-hooks file: redraw any hook and the
   page picks it up on the next load. Nothing to lift, nothing to rebuild.

   EVERY DRAWING HOOK IS CALLED AS  hook(g, w, h, t, ...data)
     g     a canvas 2D context, already scaled for the screen: draw in CSS
           pixels, (0, 0) top left, w × h the canvas's size on the page
     t     seconds since the page opened (frozen at 0 when the player asks
           their system for reduced motion)
     data  plain values, listed per hook below
   The canvas is cleared before each call, and called every frame while it
   is on screen. A hook that throws is caught and reported once in the
   console; its canvas stays blank and the rest of the page carries on.
   Delete a hook and its canvas is removed from the page.

   THE HOOKS
     theme                          colours, fonts and the corner radius,
                                    poured into the page's CSS variables once
                                    at load (see below)
     backdrop(g, w, h, t)           the whole window, behind everything
     crest(g, w, h, t)              the emblem above LEADERBOARD          140 × 96
     podium(g, w, h, t, top, board) the top three of the board on screen, on
                                    its first page only. top = [{ rank, name,
                                    score, wave, account }] (1 to 3 of them,
                                    best first; ties share a rank). board =
                                    'season' | 'all' | 'day'          full width × 220
     medal(g, w, h, t, rank)        beside the rank in the rows of 1st, 2nd and
                                    3rd (rank 1, 2 or 3)                  24 × 24
     card(g, w, h, t, c)            behind each YOUR PLACEMENT card. c = {
                                    board: 'season'|'all'|'day', rank, of }
                                    (rank 0 = not placed there)       card size
     empty(g, w, h, t, kind)        above the board's message. kind =
                                    'loading' | 'empty' | 'error' | 'pvp'   160 × 90
     league(g, w, h, t, id)         a league's crest: the PVP tab's strip, the
                                    ladder's rows, a profile. id = 'bronze' |
                                    'silver' | 'gold' | 'platinum' | 'void'
                                    76 × 76 on the strip, 22 × 22 in a row,
                                    64 × 64 on a profile (drawn on a 64 grid)

   THE PROFILE (#u/<account name>), one player's page, after osu!'s. ?hooks
   in the address outlines every canvas with its hook's name and size.
     profileBanner(g, w, h, t, p)   the cover across the top. p = { display,
                                    user, league (an id, or null while still
                                    being placed or never ranked), rating (or
                                    null), rank (on the ladder, or null),
                                    joined (ms), pilot (the one they flew
                                    last in PvP, or null), banner (the one
                                    the player picked: 'world' is the default;
                                    the rest are in src/looks.js and drawn in
                                    BANNER, THE LOOKS) }
                                             full width × 200 (130 on a phone)
     avatar(g, w, h, t, p)          the player's emblem, half over the cover.
                                    p = { display, user, league, pilot,
                                    picture (the one the player picked:
                                    'sigil' is the default; the rest in
                                    PICTURE, THE LOOKS) }
                                                   128 × 128 (88 on a phone)
     statCard(g, w, h, t, s)        behind each placement tile. s = { kind:
                                    'season' | 'all' | 'day' | 'pvp', rank
                                    (0 = not placed), of, league (pvp) }
                                                                   tile size
     pilotBadge(g, w, h, t, b)      a pilot: in the hangar, and either side of
                                    each match. b = { id: 'runner' | 'ember'
                                    | 'hacker' | 'melee', owned, awake }
                                    84 × 84 in the hangar (64 on a phone),
                                    30 × 30 in a match
     award(g, w, h, t, a)           a season podium. a = { season:
                                    '2026-09', rank: 1 | 2 | 3, score } 64 × 64
     decal(g, w, h, t, d)           one of the profile's decals, in the row
                                    under the name, and in CUSTOMIZE. d = {
                                    id (the catalog's, src/looks.js), n (its
                                    name), i (its place in the row, from 0) }
                                                   40 × 40 (34 on a phone)
     matchRow(g, w, h, t, m)        behind each recent match. m = { won: true
                                    | false | null (no contest), verdict:
                                    'played' | 'forfeit' | 'void', queue:
                                    'ranked' | 'casual' | 'friend' }
                                    row size: the result's plate is its first
                                    72 px, the score's panel its last 84
   The profile shows two of the board's hooks as well: league beside the
   name (76 × 76, 56 on a phone), and medal counting the season podiums
   (28 × 28).

   THE LOOK, after osu!'s leaderboard: everything sits on rounded panels,
   arrives with a quick ease that settles slowly (OutQuint), one thing after
   another, and osu!'s triangles drift upward behind it all. The rows
   themselves are HTML, so their slide-in and their corners are in
   leaderboard.css; the helpers below (life, the easings, roundPath, badge,
   triangles) are here for any hook that wants the same moves.

   Everything else (layout, tabs, the rows) is plain CSS in leaderboard.css
   and reads the theme's variables.
   ========================================================================= */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------- colour -------------------------------- */
  const rgb = hex => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const css = (c, a = 1) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
  const rgba = (hex, a) => css(rgb(hex), a);
  const lerp = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  // a metal: its highlight, its body and its shadow
  const metal = (hi, mid, lo) => ({ hi: rgb(hi), mid: rgb(mid), lo: rgb(lo) });
  // that metal lit by k: 0 is its shadow, 1 its highlight
  const lit = (M, k) => (k < 0.5 ? lerp(M.lo, M.mid, k * 2) : lerp(M.mid, M.hi, k * 2 - 1));
  const METAL = {
    gold:     metal('#fff5c4', '#fbbf24', '#9a5b07'),
    silver:   metal('#ffffff', '#cbd5e1', '#56637a'),
    bronze:   metal('#ffd6b0', '#e08a46', '#76360d'),
    platinum: metal('#effffe', '#67e8f9', '#0b6278'),
    void:     metal('#f5d0fe', '#c084fc', '#3b0f7a'),
    cyan:     metal('#e6fdff', '#67e8f9', '#12556b')
  };
  const PLACE = { 1: METAL.gold, 2: METAL.silver, 3: METAL.bronze };
  // the void's colours, cycling: cyan, violet, pink and round again
  const RADIANT = ['#67e8f9', '#a78bfa', '#f472b6'].map(rgb);
  const radiant = u => {
    u = (((u % 1) + 1) % 1) * 3;
    const i = Math.floor(u);
    return lerp(RADIANT[i], RADIANT[(i + 1) % 3], u - i);
  };
  // the light falls from up and to the left: how lit a face turned to angle a is
  const LIGHT = Math.atan2(-0.8, -0.6);
  const facing = a => 0.5 + 0.5 * Math.cos(a - LIGHT);

  /* ------------------------------ easing, time ----------------------------- */
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const outQuint = x => 1 - Math.pow(1 - clamp01(x), 5);
  const outBack = x => { x = clamp01(x); const d = x - 1; return 1 + 2.6 * d * d * d + 1.6 * d * d; };

  // How long a canvas has been on show, in seconds. Its clock starts on its
  // first frame, again when it comes back after being hidden, and again when
  // `key` changes (new data in the same canvas), so each entrance plays anew.
  // Reduced motion skips every entrance to its end. Frames are counted here,
  // ahead of the page's own painting, so a canvas that missed one was hidden.
  const SHOWN = new WeakMap();
  let frameNo = 0;
  if (!STILL) (function tick() { frameNo++; requestAnimationFrame(tick); })();
  const life = (g, t, key) => {
    if (STILL) return 99;
    let s = SHOWN.get(g);
    if (!s || s.frame < frameNo - 1 || s.key !== key) SHOWN.set(g, s = { t0: t, key });
    s.frame = frameNo;
    return t - s.t0;
  };

  /* -------------------------------- shapes -------------------------------- */
  // a closed path through pts, each corner rounded by r (a number, or one per corner)
  const roundPath = (g, pts, r) => {
    const n = pts.length;
    g.beginPath();
    g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      g.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, Array.isArray(r) ? r[i] : r);
    }
    g.closePath();
  };
  const rrect = (g, x, y, w, h, r) =>
    roundPath(g, [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], Math.min(r, w / 2, h / 2));
  // a regular polygon's corners, clockwise, the first at angle rot
  const ngon = (x, y, r, sides, rot) => {
    const pts = [];
    for (let i = 0; i < sides; i++) {
      const a = rot + i * TAU / sides;
      pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]);
    }
    return pts;
  };
  // the pilot's arrowhead, nose up, centred on (x, y), s = half its length
  const ship = (g, x, y, s) => roundPath(g, [
    [x, y - s], [x + s * 0.72, y + s * 0.78], [x, y + s * 0.38], [x - s * 0.72, y + s * 0.78]
  ], [s * 0.12, s * 0.1, s * 0.05, s * 0.1]);
  // a four-pointed sparkle
  const sparkle = (g, x, y, r) => {
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 ? r * 0.26 : r, a = i * Math.PI / 4 - Math.PI / 2;
      i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
  };
  // a name squeezed to fit, one character at a time
  const fit = (g, text, max) => {
    let s = String(text);
    if (g.measureText(s).width <= max) return s;
    while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  };
  const seeded = seed => () => ((seed = (seed * 16807) % 2147483647) / 2147483647);

  /* osu!'s triangles: a fixed set, rising forever through the box (x, y, w, h).
     o = { n, lo, hi (sizes in px), speed (px/s), col ([r,g,b]), alpha, seed,
     line (outline every nth one instead of filling it) } */
  const TRIS = (() => {
    const r = seeded(4242), out = [];
    for (let i = 0; i < 64; i++) out.push({ x: r(), y: r(), s: r(), k: r() });
    return out;
  })();
  const triangles = (g, x, y, w, h, t, o) => {
    const n = o.n || 20, lo = o.lo || 8, hi = o.hi || 40, seed = o.seed || 0;
    for (let i = 0; i < n; i++) {
      const p = TRIS[(i + seed) % TRIS.length];
      const s = lo + (hi - lo) * p.s * p.s;            // mostly small ones
      const span = h + s * 2;
      const ty = y + h + s - ((p.y * span + t * (o.speed || 10) * (0.55 + p.k * 0.9)) % span);
      const tx = x + p.x * w, th = s * 0.866;
      g.beginPath();
      g.moveTo(tx, ty - th * 2 / 3); g.lineTo(tx + s / 2, ty + th / 3); g.lineTo(tx - s / 2, ty + th / 3);
      g.closePath();
      const a = (o.alpha || 0.05) * (0.35 + 0.65 * p.k);
      if (o.line && i % o.line === 0) { g.strokeStyle = css(o.col, a * 1.6); g.lineWidth = 1; g.stroke(); }
      else { g.fillStyle = css(o.col, a); g.fill(); }
    }
  };

  // a soft round light
  const glow = (g, x, y, r, col, a) => {
    const gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, css(col, a));
    gr.addColorStop(1, css(col, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // a band of light across whatever path() outlines, every `period` seconds,
  // from `age` (so the first one follows the entrance)
  const glint = (g, age, period, path, x0, x1, y0, y1, a = 0.5) => {
    if (STILL) return;
    const u = (((age - 0.35) % period + period) % period) / 0.75;
    if (u >= 1) return;
    const span = y1 - y0, sk = span * 0.35, e = u * u * (3 - 2 * u);
    const x = x0 - sk - span * 0.2 + (x1 - x0 + sk * 2 + span * 0.4) * e;
    g.save();
    path();
    g.clip();
    for (const [wd, al] of [[span * 0.16, a * 0.35], [span * 0.06, a]]) {
      g.fillStyle = 'rgba(255,255,255,' + al + ')';
      g.beginPath();
      g.moveTo(x - wd + sk, y0); g.lineTo(x + wd + sk, y0); g.lineTo(x + wd - sk, y1); g.lineTo(x - wd - sk, y1);
      g.fill();
    }
    g.restore();
  };

  /* A rounded badge in a metal with a number on it, lit from the top, a glint
     crossing it now and then: the podium's places and the rows' medals. */
  const badge = (g, x, y, s, M, label, age, phase) => {
    const r = s * 0.32, x0 = x - s / 2, y0 = y - s / 2;
    const path = () => rrect(g, x0, y0, s, s, r);
    path();
    const body = g.createLinearGradient(x0, y0, x0 + s * 0.45, y0 + s);
    body.addColorStop(0, css(M.hi)); body.addColorStop(0.5, css(M.mid)); body.addColorStop(1, css(M.lo));
    g.fillStyle = body; g.fill();
    g.save();
    path(); g.clip();
    const sheen = g.createLinearGradient(0, y0, 0, y);
    sheen.addColorStop(0, 'rgba(255,255,255,0.42)'); sheen.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = sheen; g.fillRect(x0, y0, s, s / 2);
    g.restore();
    glint(g, age + phase, 4.2, path, x0 - s * 0.3, x0 + s * 1.3, y0, y0 + s, 0.55);
    // the inner rim: a catch of light above, a shadow below
    rrect(g, x0 + 0.75, y0 + 0.75, s - 1.5, s - 1.5, r - 0.75);
    const rim = g.createLinearGradient(0, y0, 0, y0 + s);
    rim.addColorStop(0, 'rgba(255,255,255,0.75)'); rim.addColorStop(0.5, 'rgba(255,255,255,0)');
    rim.addColorStop(1, 'rgba(0,0,0,0.3)');
    g.strokeStyle = rim; g.lineWidth = 1; g.stroke();
    // the number, pressed into the metal
    g.font = '700 ' + Math.round(s * 0.56) + "px 'Chakra Petch', 'JetBrains Mono', sans-serif";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = 'rgba(255,255,255,0.5)';
    g.fillText(label, x, y + s * 0.04 + 0.9);
    g.fillStyle = css(lerp(M.lo, [8, 10, 18], 0.6));
    g.fillText(label, x, y + s * 0.04);
  };

  /* ------------------------------ the crests ------------------------------ */
  // A rim cut into lit faces. out and inn are the outline and the face, corner
  // for corner, clockwise; colourOf(i, k) gives face i's colour lit by k.
  const bevel = (g, out, inn, cr, base, colourOf) => {
    roundPath(g, out, cr);
    g.fillStyle = css(base);                   // under the seams between faces
    g.fill();
    g.save();
    g.clip();
    const n = out.length;
    for (let i = 0; i < n; i++) {
      const a = out[i], b = out[(i + 1) % n], c = inn[(i + 1) % n], d = inn[i];
      g.beginPath();                           // the outer corners pushed past the round ones
      g.moveTo(a[0] * 1.2, a[1] * 1.2); g.lineTo(b[0] * 1.2, b[1] * 1.2); g.lineTo(c[0], c[1]); g.lineTo(d[0], d[1]);
      g.closePath();
      g.fillStyle = css(colourOf(i, facing(Math.atan2(-(b[0] - a[0]), b[1] - a[1]))));
      g.fill();
    }
    g.restore();
    // a bright edge where the light catches the top
    roundPath(g, out, cr);
    const top = g.createLinearGradient(0, out[0][1], 0, 0);
    top.addColorStop(0, 'rgba(255,255,255,0.7)'); top.addColorStop(1, 'rgba(255,255,255,0)');
    g.strokeStyle = top; g.lineWidth = 0.8; g.stroke();
  };
  // the sunk face inside a rim
  const face = (g, inn, cr, M) => {
    const ri = Math.hypot(inn[0][0], inn[0][1]);
    roundPath(g, inn, cr);
    const f = g.createRadialGradient(0, -ri * 0.4, 0, 0, 0, ri * 1.15);
    f.addColorStop(0, css(lerp([14, 18, 34], M.mid, 0.2)));
    f.addColorStop(1, css(lerp([5, 7, 14], M.lo, 0.3)));
    g.fillStyle = f; g.fill();
    const e = g.createLinearGradient(0, -ri, 0, ri);
    e.addColorStop(0, 'rgba(0,0,0,0.65)'); e.addColorStop(1, css(M.hi, 0.4));
    g.strokeStyle = e; g.lineWidth = 1; g.stroke();
  };
  // n chevrons stacked up the face, in the metal
  const chevrons = (g, n, M) => {
    const a = 7.4, b = 5.4, th = 3.1, step = 5.3;
    const y0 = -((n - 1) * step) / 2 - 1.2 - (n === 3 ? 0.6 : 0);
    g.save();
    g.shadowColor = css(M.mid, 0.6); g.shadowBlur = 5;
    for (let i = 0; i < n; i++) {
      const y = y0 + i * step;
      roundPath(g, [[-a, y + b / 2], [0, y - b / 2], [a, y + b / 2], [a, y + b / 2 + th],
                    [0, y - b / 2 + th * 1.32], [-a, y + b / 2 + th]], [0.9, 1.1, 0.9, 0.9, 0.5, 0.9]);
      const gr = g.createLinearGradient(0, y - b / 2, 0, y + b / 2 + th);
      gr.addColorStop(0, css(M.hi)); gr.addColorStop(1, css(lit(M, 0.62)));
      g.fillStyle = gr; g.fill();
    }
    g.restore();
  };
  // swept blades either side: f = [length, angle, thickness, y] from the top one down
  const wings = (g, root, feathers, M, flap) => {
    for (const side of [-1, 1]) {
      g.save();
      g.scale(side, 1);
      for (let i = feathers.length - 1; i >= 0; i--) {     // the top one last, over the rest
        const [len, ang0, th, y] = feathers[i];
        const ang = ang0 + flap * (1 - i / feathers.length);
        const tx = root + Math.cos(ang) * len, ty = y + Math.sin(ang) * len;
        const nx = -Math.sin(ang) * th / 2, ny = Math.cos(ang) * th / 2;
        g.beginPath();
        g.moveTo(root - nx, y - ny);
        g.quadraticCurveTo(root + (tx - root) * 0.6 - nx * 1.3, y + (ty - y) * 0.6 - ny * 1.3, tx, ty);
        g.quadraticCurveTo(root + (tx - root) * 0.45 + nx * 0.5, y + (ty - y) * 0.45 + ny * 0.5, root + nx, y + ny);
        g.closePath();
        const k = 1 - (i / feathers.length) * 0.5;
        const gr = g.createLinearGradient(root, y, tx, ty);
        gr.addColorStop(0, css(lit(M, 0.15 + 0.2 * k))); gr.addColorStop(1, css(lit(M, 0.5 + 0.5 * k)));
        g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(4,6,12,0.55)'; g.lineWidth = 0.6; g.stroke();
      }
      g.restore();
    }
  };
  // blades fanning out from behind the crest: b = [angle in degrees, reach, half-width]
  const halo = (g, blades, colourOf, t) => {
    blades.forEach(([deg, reach, wd], i) => {
      const r1 = reach + (STILL ? 0 : Math.sin(t * 2 + i * 1.3) * 0.8), r0 = 10;
      g.save();
      g.rotate(deg * Math.PI / 180 + Math.PI / 2);
      g.beginPath();
      g.moveTo(-wd, -r0);
      g.quadraticCurveTo(-wd * 0.8, -(r0 + r1) * 0.62, 0, -r1);
      g.quadraticCurveTo(wd * 0.8, -(r0 + r1) * 0.62, wd, -r0);
      g.closePath();
      const c = colourOf(i), gr = g.createLinearGradient(0, -r0, 0, -r1);
      gr.addColorStop(0, css(c.lo)); gr.addColorStop(0.55, css(c.mid)); gr.addColorStop(1, css(c.hi));
      g.fillStyle = gr; g.fill();
      g.restore();
    });
  };

  // BRONZE, SILVER, GOLD: a beveled hexagon with a chevron per step; silver
  // grows fins, gold full wings and a star
  const hexCrest = (g, t, age, M, tier) => {
    const R = tier ? 21 : 22.5, ri = R - 5.6, cr = 3.4;
    const flap = STILL ? 0 : Math.sin(t * 1.7) * 0.035;
    if (tier === 1) wings(g, R * 0.7, [[12.5, -0.45, 6.5, -3.5], [9.5, 0.12, 5, 3]], M, flap);
    if (tier === 2) wings(g, R * 0.72, [[16, -0.62, 5.6, -5], [14, -0.22, 5, 0], [11, 0.18, 4.4, 5]], M, flap);
    const out = ngon(0, 0, R, 6, -Math.PI / 2), inn = ngon(0, 0, ri, 6, -Math.PI / 2);
    bevel(g, out, inn, cr, M.mid, (i, k) => lit(M, k));
    face(g, inn, cr * 0.6, M);
    chevrons(g, tier + 1, M);
    glint(g, age + tier * 0.6, 4.6, () => roundPath(g, out, cr), -R, R, -R, R);
    if (tier === 2) {
      const tw = STILL ? 1 : 0.8 + 0.2 * Math.sin(t * 3.1);
      g.save();
      g.shadowColor = css(M.mid); g.shadowBlur = 6;
      sparkle(g, 0, -R - 4.6, 4.4 * tw);
      g.fillStyle = css(M.hi); g.fill();
      g.restore();
    }
  };

  // PLATINUM: a cut gem with a light turning slowly over its facets, wings,
  // and three blades fanning up behind it
  const gemCrest = (g, t, age, M) => {
    const sway = STILL ? 0 : Math.sin(t * 0.8) * 0.3;
    halo(g, [[-90, 30, 3.2], [-126, 23.5, 2.5], [-54, 23.5, 2.5]], () => M, t);
    wings(g, 10.5, [[18, -0.72, 6, -6], [16, -0.32, 5.4, -1], [13, 0.05, 4.8, 4], [10, 0.42, 4.2, 8]],
          M, STILL ? 0 : Math.sin(t * 1.7) * 0.035);
    const out = [[0, -24], [15, -9], [12, 10], [0, 24], [-12, 10], [-15, -9]];
    const inn = out.map(([x, y]) => [x * 0.5, y * 0.5 - 1.6]);
    const outline = () => roundPath(g, out, 1.6);
    outline();
    g.fillStyle = css(M.mid); g.fill();
    g.save();
    outline(); g.clip();
    for (let i = 0; i < 6; i++) {             // each facet in two halves, lit a touch apart
      const a = out[i], b = out[(i + 1) % 6], c = inn[(i + 1) % 6], d = inn[i];
      const k = facing(Math.atan2(-(b[0] - a[0]), b[1] - a[1]) + sway);
      for (const [p, q, r, dk] of [[a, b, d, 0.09], [b, c, d, -0.09]]) {
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(r[0], r[1]); g.closePath();
        g.fillStyle = css(lit(M, clamp01(k + dk))); g.fill();
      }
    }
    // the table on top, with a star cut into it
    roundPath(g, inn, 0.8);
    const tb = g.createLinearGradient(-6, -12, 6, 10);
    tb.addColorStop(0, css(M.hi)); tb.addColorStop(1, css(lit(M, 0.55 + sway * 0.3)));
    g.fillStyle = tb; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.5;
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      g.moveTo(inn[i][0], inn[i][1]); g.lineTo(out[i][0], out[i][1]);
      g.moveTo(inn[i][0], inn[i][1]); g.lineTo(0, -1.6);
    }
    g.stroke();
    g.restore();
    outline();
    g.strokeStyle = css(M.hi, 0.75); g.lineWidth = 0.8; g.stroke();
    glint(g, age + 1.2, 4.6, outline, -16, 16, -24, 24, 0.6);
    // a sparkle hopping between facets
    if (!STILL) {
      const spots = [[-7, -11], [8, 4], [-4, 9]], n = Math.floor(t / 1.6) % 3, u = (t % 1.6) / 1.6;
      g.save();
      g.globalAlpha *= Math.sin(u * Math.PI);
      sparkle(g, spots[n][0], spots[n][1], 3.6);
      g.fillStyle = '#fff'; g.fill();
      g.restore();
    }
  };

  // the ring around the void, either its far half or its near one, with
  // sparks riding it
  const voidRing = (g, t, front) => {
    const rx = 29.5, ry = 7.2;
    g.save();
    g.rotate(-0.32);
    g.beginPath();
    if (front) g.ellipse(0, 0, rx, ry, 0, 0, Math.PI);
    else g.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
    const gr = g.createLinearGradient(-rx, 0, rx, 0);
    for (let i = 0; i <= 4; i++) gr.addColorStop(i / 4, css(radiant(i / 4 + t * 0.07), front ? 0.95 : 0.4));
    g.strokeStyle = gr; g.lineWidth = front ? 2.1 : 1.5; g.lineCap = 'round'; g.stroke();
    if (!STILL) {
      for (let i = 0; i < 3; i++) {
        const a = t * 0.9 + i * TAU / 3;
        if ((Math.sin(a) > 0) !== front) continue;
        g.shadowColor = css(radiant(i / 3)); g.shadowBlur = 5;
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(Math.cos(a) * rx, Math.sin(a) * ry, front ? 1.3 : 0.9, 0, TAU); g.fill();
      }
    }
    g.restore();
  };

  // VOID: a hexagon whose faces run through the void's colours, a black hole
  // for a face, a ring through it and a fan of five blades behind
  const voidCrest = (g, t, age, M) => {
    const R = 20.5, ri = 15, cr = 3.4, drift = STILL ? 0 : t * 0.06;
    voidRing(g, t, false);
    const tint = u => { const c = radiant(u); return { hi: lerp(c, [255, 255, 255], 0.7), mid: c, lo: lerp(c, [12, 4, 32], 0.72) }; };
    halo(g, [[-90, 31, 3.1], [-124, 27, 2.6], [-56, 27, 2.6], [-148, 23.5, 2], [-32, 23.5, 2]],
         i => tint(i * 0.13 + drift), t);
    const out = ngon(0, 0, R, 6, -Math.PI / 2), inn = ngon(0, 0, ri, 6, -Math.PI / 2);
    bevel(g, out, inn, cr, [40, 14, 70], (i, k) => lit(tint(i / 6 + drift), k));
    // the black hole
    roundPath(g, inn, 2);
    const f = g.createRadialGradient(0, 0, 0, 0, 0, ri);
    f.addColorStop(0, '#000'); f.addColorStop(0.5, '#06020e'); f.addColorStop(1, css(lerp([20, 6, 40], M.lo, 0.5)));
    g.fillStyle = f; g.fill();
    g.save();
    g.clip();
    g.lineCap = 'round';
    for (let j = 0; j < 3; j++) {               // matter spiralling in
      const c = radiant(j / 3 + drift);
      for (let s = 0; s < 1; s += 0.1) {
        const a0 = j * TAU / 3 + s * 2.4 - (STILL ? 0 : t * 0.9), a1 = a0 + 0.24;
        const r0 = 13.5 - s * 7, r1 = 13.5 - (s + 0.1) * 7;
        g.strokeStyle = css(c, 0.55 * (1 - s * 0.6));
        g.lineWidth = 0.5 + 1.4 * (1 - s);
        g.beginPath(); g.moveTo(Math.cos(a0) * r0, Math.sin(a0) * r0); g.lineTo(Math.cos(a1) * r1, Math.sin(a1) * r1); g.stroke();
      }
    }
    g.restore();
    roundPath(g, inn, 2);
    g.strokeStyle = 'rgba(0,0,0,0.6)'; g.lineWidth = 1; g.stroke();
    g.save();
    g.shadowColor = css(M.mid); g.shadowBlur = 7;
    g.strokeStyle = css(M.hi, 0.9); g.lineWidth = 1.2;
    g.beginPath(); g.arc(0, 0, 6.4 + (STILL ? 0 : Math.sin(t * 2.4) * 0.3), 0, TAU); g.stroke();
    g.restore();
    g.fillStyle = '#000';
    g.beginPath(); g.arc(0, 0, 5.5, 0, TAU); g.fill();
    glint(g, age + 2.4, 5.2, () => roundPath(g, out, cr), -R, R, -R, R, 0.4);
    voidRing(g, t, true);
  };

  const LEAGUE = {
    bronze:   { tier: 0, M: METAL.bronze },
    silver:   { tier: 1, M: METAL.silver },
    gold:     { tier: 2, M: METAL.gold },
    platinum: { tier: 3, M: METAL.platinum },
    void:     { tier: 4, M: METAL.void }
  };

  // a league's crest at the crest's own scale (a 64 grid), for any hook that wants one
  const crestOf = (g, id, t, age) => {
    const L = LEAGUE[id] || LEAGUE.bronze;
    if (id === 'void') voidCrest(g, t, age, L.M);
    else if (id === 'platinum') gemCrest(g, t, age, L.M);
    else hexCrest(g, t, age, L.M, L.tier);
  };

  /* ------------------------------ the profile ------------------------------ */
  // a name to a seed, the same every time: each player's cover and emblem are their own
  const seedOf = s => {
    let h = 2166136261;
    for (const c of String(s || '')) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619); }
    return (h >>> 0) % 2147483646 + 1;
  };
  // the game's colours, for a player's own pair
  const HUES = ['#67e8f9', '#a78bfa', '#f472b6', '#a3e635', '#fbbf24', '#f87171', '#a5b4fc', '#38bdf8', '#34d399', '#fb923c'].map(rgb);
  const metalOf = id => (id && LEAGUE[id] ? LEAGUE[id].M : METAL.cyan);
  const COLD = metal('#94a3b8', '#475569', '#1e293b');       // locked, unplaced: no metal yet

  /* The pilots, by the game's ids (CHARS in index.html): each hull's outline
     as the game's hullPath() draws it (nose along +x, in the game's pixels),
     its colour and engines, and what it burns when awake: EMBER's IFRIT in
     fire, THE HACKER's SUPERUSER in gold, THE VAGRANT's RONIN in red. A pilot
     added to the game is a line here; one this file doesn't know flies as
     VOIDRUNNER. */
  const PILOT = {
    runner: { col: '#67e8f9', hi: '#e0f2fe', fire: '#a5f3fc', awake: null, eye: 8, eng: [[-6.5, 3.2], [-6.5, -3.2]],
              hull: [[18, 0], [9, 3.4], [5.5, 8.5], [-5, 13], [-8.5, 9.5], [-6, 4.2], [-10.5, 3.2], [-6.5, 0],
                     [-10.5, -3.2], [-6, -4.2], [-8.5, -9.5], [-5, -13], [5.5, -8.5], [9, -3.4]] },
    ember:  { col: '#f87171', hi: '#fecaca', fire: '#fb923c', awake: '#fb923c', eye: 9, eng: [[-9, 0]],
              hull: [[22, 0], [13, 2.6], [9, 7], [2, 13.5], [-7, 12], [-5, 4.6], [-12, 3.2], [-9, 0],
                     [-12, -3.2], [-5, -4.6], [-7, -12], [2, -13.5], [9, -7], [13, -2.6]] },
    hacker: { col: '#a3e635', hi: '#ecfccb', fire: '#d9f99d', awake: '#fbbf24', eye: 8, eng: [[-9, 0]],
              hull: [[18, 0], [4, 6], [10, 13], [-4, 11], [-9, 0], [-4, -11], [10, -13], [4, -6]] },
    melee:  { col: '#a5b4fc', hi: '#e0e7ff', fire: '#c7d2fe', awake: '#ef4444', eye: 7, eng: [[-12.8, 0]],
              hull: [[12.6, 0], [10.4, 4.4], [11.4, 10.2], [2.4, 13.2], [-6.4, 12], [-9.2, 6], [-15, 4], [-12.8, 0],
                     [-15, -4], [-9.2, -6], [-6.4, -12], [2.4, -13.2], [11.4, -10.2], [10.4, -4.4]] }
  };
  for (const [id, P] of Object.entries(PILOT)) {
    const xs = P.hull.map(p => p[0]);
    P.id = id; P.x0 = Math.min(...xs); P.x1 = Math.max(...xs);
    P.cx = (P.x0 + P.x1) / 2; P.len = P.x1 - P.x0;
    P.M = { hi: rgb(P.hi), mid: rgb(P.col), lo: lerp(rgb(P.col), [6, 8, 16], 0.72) };
  }
  const pilotOf = id => PILOT[id] || PILOT.runner;

  /* A pilot's ship, nose up, centred on (x, y) and `size` long, turned by
     o.rot: its engines burning, its hull in its colour with the game's
     furniture on it (after hullDetail()), and an eye lit when o.awake.
     o.dark draws it locked: a cold shadow of itself. */
  const pilotShip = (g, P, x, y, size, t, o = {}) => {
    const k = size / P.len;
    g.save();
    g.translate(x, y); g.rotate((o.rot || 0) - Math.PI / 2); g.scale(k, k); g.translate(-P.cx, 0);
    g.lineJoin = 'round'; g.lineCap = 'round';
    const outline = () => {
      g.beginPath();
      P.hull.forEach(([a, b], i) => (i ? g.lineTo(a, b) : g.moveTo(a, b)));
      g.closePath();
    };
    if (o.dark) {
      outline();
      g.fillStyle = '#111827'; g.fill();
      g.strokeStyle = 'rgba(71, 85, 105, .95)'; g.lineWidth = 1.3; g.stroke();
      g.restore();
      return;
    }
    const fl = STILL ? 0.85 : 0.7 + 0.3 * Math.sin(t * 22 + (o.phase || 0));
    for (const [ex, ey] of P.eng) {
      glow(g, ex - 4, ey, 10 * fl, rgb(P.fire), 0.5);
      g.fillStyle = 'rgba(240, 249, 255, .7)';
      g.beginPath(); g.moveTo(ex + 0.5, ey + 2.3); g.lineTo(ex - 9 - 7 * fl, ey); g.lineTo(ex + 0.5, ey - 2.3); g.closePath(); g.fill();
    }
    outline();
    const body = g.createLinearGradient(P.x1, 0, P.x0, 0);
    body.addColorStop(0, P.hi); body.addColorStop(0.5, P.col); body.addColorStop(1, css(P.M.lo));
    g.save();
    g.shadowColor = P.col; g.shadowBlur = o.glow === undefined ? 10 : o.glow;
    g.fillStyle = body; g.fill();
    g.restore();
    // the furniture, inside the outline the way the game keeps it
    g.save();
    outline(); g.clip();
    const dark = 'rgba(9, 15, 28, .72)', bright = css(P.M.hi, 0.75);
    if (P.id === 'ember') {
      g.strokeStyle = dark; g.lineWidth = 3.4;
      g.beginPath(); g.moveTo(3, 0); g.lineTo(18, 0); g.stroke();
      g.strokeStyle = bright; g.lineWidth = 1;
      g.beginPath(); g.moveTo(4, -2); g.lineTo(17.5, -2); g.moveTo(4, 2); g.lineTo(17.5, 2); g.stroke();
      g.strokeStyle = dark; g.lineWidth = 1.6;
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        const vx = 4.4 - i * 3.6;
        g.moveTo(vx, 6.6 + i * 1.1); g.lineTo(vx - 2.6, 11.8);
        g.moveTo(vx, -6.6 - i * 1.1); g.lineTo(vx - 2.6, -11.8);
      }
      g.stroke();
    } else {
      g.strokeStyle = dark; g.lineWidth = 1.2;
      g.beginPath(); g.moveTo(-5, 0); g.lineTo(15, 0); g.moveTo(-1.8, -5.8); g.lineTo(-1.8, 5.8); g.stroke();
      g.strokeStyle = bright; g.lineWidth = 1.1;
      g.beginPath();
      if (P.id === 'runner') {
        g.moveTo(5.4, 8.2); g.lineTo(-4.6, 11.8); g.moveTo(5.4, -8.2); g.lineTo(-4.6, -11.8);
        g.moveTo(2.6, 4.2); g.lineTo(-3.6, 9.2); g.moveTo(2.6, -4.2); g.lineTo(-3.6, -9.2);
      } else { g.moveTo(4, 4.5); g.lineTo(-4, 7.2); g.moveTo(4, -4.5); g.lineTo(-4, -7.2); }
      g.stroke();
      if (P.id === 'runner') { g.fillStyle = dark; g.fillRect(6.4, 2.2, 4.6, 1.5); g.fillRect(6.4, -3.7, 4.6, 1.5); }
      if (P.id === 'hacker' && !o.awake) {         // a terminal in the bay, its cursor blinking
        g.fillStyle = 'rgba(6, 12, 4, .85)'; g.fillRect(4.6, -2.4, 6.4, 4.8);
        if (STILL || Math.sin(t * 6.5) > -0.2) { g.fillStyle = P.hi; g.fillRect(6, -1.5, 2, 3); }
      }
      if (P.id === 'melee') { g.fillStyle = dark; g.fillRect(6.2, -3.8, 2.4, 7.6); }   // the visor slit
    }
    g.restore();
    // awake: the form's eye, lit
    if (o.awake) {
      const ec = P.awake ? rgb(P.awake) : radiant(t * 0.2), ex = P.eye;
      glow(g, ex, 0, 9, ec, 0.9);
      g.fillStyle = '#fff';
      g.beginPath(); g.ellipse(ex, 0, 1.3, 2.8, 0, 0, TAU); g.fill();
    }
    outline();
    g.strokeStyle = css(P.M.hi, 0.85); g.lineWidth = 0.9; g.stroke();
    g.restore();
  };

  /* What an awakened pilot's badge burns with, round a hexagon of radius R:
     IFRIT's flames, SUPERUSER's gold ring of bits, RONIN's red crescents and
     the cut they make, VOIDRUNNER's light in every colour of the void. */
  const aura = (g, P, t, R, small) => {
    const c = P.awake ? rgb(P.awake) : radiant(t * 0.1);
    g.save();
    g.globalCompositeOperation = 'lighter';
    glow(g, 0, 0, R + 12, c, 0.3);
    if (small) {
      g.strokeStyle = css(c, 0.8); g.lineWidth = 2;
      g.beginPath(); g.arc(0, 0, R + 3.5, 0, TAU); g.stroke();
      g.restore();
      return;
    }
    if (P.id === 'ember') {
      for (const [n, al, len] of [[16, 0.5, 1], [11, 0.55, 0.6]]) {
        for (let i = 0; i < n; i++) {
          const a = (i + (len < 1 ? 0.5 : 0)) / n * TAU;
          const f = STILL ? 0.7 : 0.55 + 0.45 * Math.sin(t * 8.7 + i * 2.3) * Math.sin(t * 5.1 + i * 1.7);
          const up = 0.5 + 0.5 * Math.max(0, -Math.sin(a));    // taller over the top
          const r0 = R - 3, r1 = R + (3 + 6 * f) * up * len + 2;
          const ax = Math.cos(a), ay = Math.sin(a), bw = 2.8 * len + 1;
          const tx = ax * r1 + Math.sin(t * 3 + i) * 0.8, ty = ay * r1 - 2.5 * up;
          g.beginPath();
          g.moveTo(ax * r0 - ay * bw, ay * r0 + ax * bw);
          g.quadraticCurveTo(ax * (r0 + 3) - ay * bw * 0.4, ay * (r0 + 3) + ax * bw * 0.4 - up, tx, ty);
          g.quadraticCurveTo(ax * (r0 + 3) + ay * bw * 0.4, ay * (r0 + 3) - ax * bw * 0.4 - up, ax * r0 + ay * bw, ay * r0 - ax * bw);
          g.closePath();
          g.fillStyle = len < 1 ? 'rgba(253, 224, 71, ' + al + ')' : 'rgba(249, 115, 22, ' + al + ')';
          g.fill();
        }
      }
    } else if (P.id === 'hacker') {
      g.strokeStyle = css(c, 0.85); g.lineWidth = 1.4;
      g.setLineDash([5, 3.2]); g.lineDashOffset = STILL ? 0 : -t * 12;
      g.beginPath(); g.arc(0, 0, R + 4.5, 0, TAU); g.stroke();
      g.setLineDash([]);
      g.font = "700 6px 'JetBrains Mono', monospace";
      g.textAlign = 'center'; g.textBaseline = 'middle';
      for (let i = 0; i < 10; i++) {
        const a = i / 10 * TAU - t * 0.5, flick = Math.floor(t * 4 + i * 7) % 5;
        g.fillStyle = css(c, flick ? 0.75 : 0.25);
        g.fillText((i * 7 + Math.floor(t * 2)) % 3 ? '1' : '0', Math.cos(a) * (R + 9), Math.sin(a) * (R + 9));
      }
    } else if (P.id === 'melee') {
      for (let i = 0; i < 2; i++) {
        const a = t * 1.3 + i * Math.PI;
        g.fillStyle = css(c, 0.85);
        g.beginPath();
        g.arc(0, 0, R + 6.5, a, a + 1.1);
        g.arc(Math.cos(a + 0.55) * 2.2, Math.sin(a + 0.55) * 2.2, R + 5, a + 1.1, a, true);
        g.closePath(); g.fill();
      }
      if (!STILL) {                                    // the cut, now and then
        const u = (t % 2.8) / 0.32;
        if (u < 1) {
          const e = outQuint(u), L = R + 10;
          g.strokeStyle = 'rgba(255, 228, 230, ' + (1 - u) + ')'; g.lineWidth = 2.4 * (1 - u) + 0.4;
          g.beginPath(); g.moveTo(-L, L * 0.55); g.lineTo(-L + 2 * L * e, L * 0.55 - 1.1 * L * e); g.stroke();
          g.strokeStyle = css(c, 0.7 * (1 - u)); g.lineWidth = 5 * (1 - u);
          g.stroke();
        }
      }
    } else {
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * TAU + t * 0.6;
        g.strokeStyle = css(radiant(i / 24 + t * 0.1), 0.85); g.lineWidth = 2;
        g.beginPath(); g.arc(0, 0, R + 4.5, a, a + TAU / 24 - 0.05); g.stroke();
      }
      for (let i = 0; i < 3; i++) {
        const a = -t * 1.4 + i * TAU / 3;
        g.fillStyle = '#fff';
        g.beginPath(); g.arc(Math.cos(a) * (R + 4.5), Math.sin(a) * (R + 4.5), 1.4, 0, TAU); g.fill();
      }
    }
    g.restore();
  };

  // a padlock, centred on (x, y), s across
  const padlock = (g, x, y, s) => {
    g.lineWidth = s * 0.16; g.strokeStyle = '#64748b';
    g.beginPath(); g.arc(x, y - s * 0.12, s * 0.3, Math.PI, 0); g.stroke();
    rrect(g, x - s * 0.45, y - s * 0.12, s * 0.9, s * 0.68, s * 0.14);
    g.fillStyle = '#475569'; g.fill();
    g.fillStyle = '#0b1220';
    g.beginPath(); g.arc(x, y + s * 0.16, s * 0.1, 0, TAU); g.fill();
  };

  /* The placement tiles' watermarks: each board's sign, in lines, filling a
     circle of radius r round (0, 0). */
  const MARK = {
    // the season: a dial, its month going round
    season(g, r, t) {
      g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU, r0 = i % 3 ? r * 0.84 : r * 0.7;
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r * 0.93, Math.sin(a) * r * 0.93);
      }
      const a = t * 0.12 - Math.PI / 2;
      g.moveTo(0, 0); g.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      g.stroke();
      g.beginPath(); g.arc(0, 0, r * 0.07, 0, TAU); g.fill();
    },
    // all-time: a star in a wreath
    all(g, r, t) {
      const pts = [];
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + i * Math.PI / 5 + (STILL ? 0 : Math.sin(t * 0.5) * 0.05), rr = i % 2 ? r * 0.2 : r * 0.46;
        pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
      }
      roundPath(g, pts, r * 0.03); g.stroke();
      for (const sd of [-1, 1]) {
        g.beginPath(); g.arc(0, 0, r * 0.8, Math.PI / 2 + sd * 0.35, Math.PI / 2 + sd * 2.5, sd < 0); g.stroke();
        for (let i = 0; i < 6; i++) {
          const a = Math.PI / 2 + sd * (0.55 + i * 0.36), x = Math.cos(a) * r * 0.8, y = Math.sin(a) * r * 0.8;
          g.save(); g.translate(x, y); g.rotate(a + sd * 0.9);
          g.beginPath(); g.ellipse(0, -r * 0.1, r * 0.05, r * 0.11, 0, 0, TAU); g.fill();
          g.restore();
        }
      }
    },
    // the daily: a sun, turning
    day(g, r, t) {
      g.beginPath(); g.arc(0, 0, r * 0.4, 0, TAU); g.stroke();
      g.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + t * 0.15, r0 = r * 0.56, r1 = i % 2 ? r * 0.78 : r * 0.95;
        g.moveTo(Math.cos(a) * r0, Math.sin(a) * r0); g.lineTo(Math.cos(a) * r1, Math.sin(a) * r1);
      }
      g.stroke();
    },
    // PvP, unplaced: two ships nose to nose
    pvp(g, r, t) {
      for (const sd of [-1, 1]) {
        g.save();
        g.translate(sd * r * 0.5, STILL ? 0 : Math.sin(t * 1.4 + sd) * r * 0.05);
        g.rotate(-sd * Math.PI / 2);
        ship(g, 0, 0, r * 0.36); g.stroke();
        g.restore();
      }
    }
  };

  // a world for a cover: a lit planet with bands, or for the void a black hole
  const planetRing = (g, x, y, R, M, front) => {
    g.save();
    g.translate(x, y); g.rotate(-0.28);
    g.beginPath();
    if (front) g.ellipse(0, 0, R * 1.75, R * 0.34, 0, 0, Math.PI);
    else g.ellipse(0, 0, R * 1.75, R * 0.34, 0, Math.PI, TAU);
    g.strokeStyle = css(M.hi, front ? 0.55 : 0.25); g.lineWidth = Math.max(2, R * 0.06); g.stroke();
    g.strokeStyle = css(M.mid, front ? 0.35 : 0.15); g.lineWidth = Math.max(5, R * 0.16); g.stroke();
    g.restore();
  };
  const planet = (g, x, y, R, M, t, seed, ringed) => {
    glow(g, x, y, R * 1.7, M.mid, 0.2);
    if (ringed) planetRing(g, x, y, R, M, false);
    g.save();
    g.beginPath(); g.arc(x, y, R, 0, TAU); g.clip();
    const body = g.createRadialGradient(x - R * 0.45, y - R * 0.5, R * 0.05, x, y, R * 1.05);
    body.addColorStop(0, css(lit(M, 0.8))); body.addColorStop(0.45, css(lit(M, 0.38))); body.addColorStop(1, css(lerp(M.lo, [0, 0, 0], 0.55)));
    g.fillStyle = body; g.fillRect(x - R, y - R, R * 2, R * 2);
    const rr = seeded(seed);
    for (let i = 0; i < 8; i++) {                 // its bands, sliding slowly round
      const by = y - R + rr() * 2 * R, bh = R * (0.03 + rr() * 0.1);
      g.fillStyle = css(i % 2 ? M.hi : M.lo, 0.1 + rr() * 0.12);
      g.beginPath(); g.ellipse(x + (STILL ? 0 : Math.sin(t * 0.04 + i) * R * 0.08), by, R * 1.2, bh, -0.28, 0, TAU); g.fill();
    }
    const night = g.createLinearGradient(x - R * 0.7, y - R * 0.7, x + R * 0.75, y + R * 0.75);
    night.addColorStop(0, 'rgba(2,3,8,0)'); night.addColorStop(0.5, 'rgba(2,3,8,0.3)'); night.addColorStop(1, 'rgba(2,3,8,0.94)');
    g.fillStyle = night; g.fillRect(x - R, y - R, R * 2, R * 2);
    g.restore();
    g.beginPath(); g.arc(x, y, R - 0.75, Math.PI * 0.8, Math.PI * 1.75);
    g.strokeStyle = css(M.hi, 0.75); g.lineWidth = 1.5; g.stroke();
    if (ringed) planetRing(g, x, y, R, M, true);
  };
  const blackHole = (g, x, y, R, t) => {
    glow(g, x, y, R * 2.4, radiant(t * 0.05), 0.22);
    const disc = front => {
      for (let i = 0; i < 4; i++) {
        g.save();
        g.translate(x, y); g.rotate(-0.22);
        g.beginPath();
        const rx = R * (1.5 + i * 0.28), ry = rx * 0.2;
        if (front) g.ellipse(0, 0, rx, ry, 0, 0, Math.PI); else g.ellipse(0, 0, rx, ry, 0, Math.PI, TAU);
        const gr = g.createLinearGradient(-rx, 0, rx, 0);
        for (let j = 0; j <= 4; j++) gr.addColorStop(j / 4, css(radiant(j / 4 + i * 0.12 + t * 0.06), (front ? 0.8 : 0.4) * (1 - i * 0.2)));
        g.strokeStyle = gr; g.lineWidth = Math.max(1.5, R * (0.11 - i * 0.02)); g.stroke();
        g.restore();
      }
    };
    disc(false);
    g.save();
    g.shadowColor = css(radiant(t * 0.08)); g.shadowBlur = R * 0.5;
    g.beginPath(); g.arc(x, y, R * 1.04, 0, TAU);
    g.strokeStyle = css(radiant(t * 0.08 + 0.3), 0.9); g.lineWidth = Math.max(1.5, R * 0.05); g.stroke();
    g.restore();
    g.fillStyle = '#000';
    g.beginPath(); g.arc(x, y, R, 0, TAU); g.fill();
    // the far side of the disc, bent up over the top of the hole
    for (const [wd, al] of [[R * 0.22, 0.25], [R * 0.08, 0.85]]) {
      g.beginPath(); g.ellipse(x, y - R * 0.06, R * 1.22, R * 1.12, 0, Math.PI * 1.04, Math.PI * 1.96);
      const gr = g.createLinearGradient(x - R, 0, x + R, 0);
      for (let j = 0; j <= 4; j++) gr.addColorStop(j / 4, css(radiant(j / 4 + t * 0.06 + 0.5), al));
      g.strokeStyle = gr; g.lineWidth = Math.max(1.2, wd); g.stroke();
    }
    disc(true);
  };

  /* ------------------------------- THE LOOKS --------------------------------
     What a profile wears (src/looks.js; PVP-PLAN.md, Phase 7 part 1), each
     by the catalog's id: the banner (profileBanner's p.banner), the picture
     (avatar's p.picture) and the decals (the decal hook's d.id). 'world' and
     'sigil', the cover and the emblem below, are the free defaults and stay
     exactly as they were drawn; everything here is a first pass, to be
     redrawn. An id this file does not know draws the default. */

  // the arena's floor in a metal, from the horizon down, its lines running at the eye
  const coverFloor = (g, w, h, t, hz, M) => {
    g.save();
    g.beginPath(); g.rect(0, hz, w, h - hz); g.clip();
    const floor = g.createLinearGradient(0, hz, 0, h);
    floor.addColorStop(0, css(lerp([6, 9, 18], M.lo, 0.25))); floor.addColorStop(1, '#060a14');
    g.fillStyle = floor; g.fillRect(0, hz, w, h - hz);
    const vx = w * 0.5, fh = h - hz;
    g.lineWidth = 1;
    for (let i = -24; i <= 24; i++) {
      const x1 = vx + i * Math.max(w, 600) * 0.08;
      const lg = g.createLinearGradient(0, hz, 0, h);
      lg.addColorStop(0, css(M.mid, 0)); lg.addColorStop(1, css(M.mid, 0.3));
      g.strokeStyle = lg;
      g.beginPath(); g.moveTo(vx + i * w * 0.012, hz); g.lineTo(x1, h); g.stroke();
    }
    const sp = STILL ? 0.5 : (t * 0.45) % 1;
    for (let j = 0; j < 14; j++) {
      const d = j + 1 - sp, y = hz + fh * 0.8 / d;
      if (y > h + 1) continue;
      g.strokeStyle = css(M.mid, 0.32 * clamp01((y - hz) / fh * 2.4));
      g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
    }
    g.restore();
    const line = g.createLinearGradient(0, 0, w, 0);
    line.addColorStop(0, css(M.hi, 0)); line.addColorStop(0.5, css(M.hi, 0.7)); line.addColorStop(1, css(M.hi, 0));
    g.fillStyle = line; g.fillRect(0, hz - 0.5, w, 1.2);
  };
  /* A banner's stage: the sky in its metal, nebulae and stars, o.back behind
     the horizon, the floor, o.front over it, then the fades every cover has
     (down to the panel at the foot, up from the dark as it first shows). */
  const coverStage = (g, w, h, t, p, o) => {
    const M = o.M, key = (p.user || p.display || '') + ':' + o.id, seed = seedOf(key), r = seeded(seed);
    const age = life(g, t, key);
    const sky = g.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, o.top || '#04060d'); sky.addColorStop(1, css(lerp([7, 10, 20], M.lo, o.tint === undefined ? 0.35 : o.tint)));
    g.fillStyle = sky; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 3; i++)
      glow(g, r() * w, r() * h * 0.7, (0.22 + r() * 0.3) * Math.max(w, h * 3), i % 2 ? M.hi : M.mid, 0.08 + 0.03 * Math.sin(t * 0.4 + i));
    const sr = seeded(seed + 7);
    for (let i = 0; i < (o.stars === undefined ? 80 : o.stars); i++) {
      const sx = sr(), sy = sr(), z = 0.2 + sr() * 0.8, ph = sr() * TAU;
      const x = ((sx * w - t * 5 * z) % w + w) % w, y = sy * h * 0.75;
      g.fillStyle = 'rgba(226,232,240,' + (0.12 + 0.5 * z * (0.6 + 0.4 * Math.sin(t * 1.5 + ph))) + ')';
      g.fillRect(x - 0.5, y - 0.5, z > 0.85 ? 1.6 : 1, z > 0.85 ? 1.6 : 1);
    }
    const hz = Math.round(h * 0.7);
    if (o.back) o.back(g, w, h, t, hz, r, age);
    coverFloor(g, w, h, t, hz, M);
    if (o.front) o.front(g, w, h, t, hz, r, age);
    const foot = g.createLinearGradient(0, h * 0.45, 0, h);
    foot.addColorStop(0, 'rgba(9,14,25,0)'); foot.addColorStop(1, 'rgba(9,14,25,0.92)');
    g.fillStyle = foot; g.fillRect(0, 0, w, h);
    glint(g, age + 0.6, 9, () => { g.beginPath(); g.rect(0, 0, w, h); }, 0, w, 0, h, 0.05);
    const dark = 1 - outQuint(age / 1.2);
    if (dark > 0) { g.fillStyle = 'rgba(5,6,10,' + dark + ')'; g.fillRect(0, 0, w, h); }
  };
  // a pilot flying big across a cover, its trail behind it
  const heroShip = (g, w, h, t, hz, P, awake) => {
    const s = h * 0.42, bob = STILL ? 0 : Math.sin(t * 0.9) * h * 0.02;
    const x = w * 0.72 + (STILL ? 0 : Math.sin(t * 0.3) * w * 0.015), y = hz - h * 0.36 + bob, a = -0.32;
    const tr = g.createLinearGradient(x - Math.cos(a) * w * 0.45, 0, x, 0);
    tr.addColorStop(0, css(P.M.mid, 0)); tr.addColorStop(1, css(P.M.mid, 0.5));
    g.strokeStyle = tr; g.lineWidth = s * 0.12; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x - Math.cos(a) * w * 0.45, y - Math.sin(a) * w * 0.45); g.lineTo(x - Math.cos(a) * s * 0.4, y - Math.sin(a) * s * 0.4); g.stroke();
    if (awake) glow(g, x, y, s * 1.3, rgb(P.awake || P.col), 0.28);
    pilotShip(g, P, x, y, s, t, { rot: Math.PI / 2 + a, glow: 10, awake });
  };
  // embers rising from the floor
  const embers = (g, w, h, t, hz, col, n) => {
    const r = seeded(91);
    for (let i = 0; i < n; i++) {
      const x0 = r() * w, sp = 12 + r() * 30, ph = r() * 40, sz = 0.8 + r() * 1.8;
      const y = hz - ((t * sp + ph * 10) % (hz + 20)), x = x0 + Math.sin(t * 1.3 + i) * 8;
      g.fillStyle = css(col, 0.35 + 0.45 * r());
      g.fillRect(x, y, sz, sz);
    }
  };
  // a falling rain of code in columns, each column's head bright
  const codeRain = (g, w, hz, t, col, a, step) => {
    const r = seeded(17), GL = '01ABCDEF#$<>/';
    g.font = "600 10px 'JetBrains Mono', monospace";
    g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let x = step / 2; x < w; x += step) {
      const sp = 30 + r() * 50, off = r() * 400, len = 5 + Math.floor(r() * 6);
      const head = ((t * sp + off) % (hz + len * 12));
      for (let j = 0; j < len; j++) {
        const y = head - j * 12;
        if (y < 0 || y > hz) continue;
        g.fillStyle = css(j ? col : [255, 255, 255], a * (1 - j / len));
        g.fillText(GL[(Math.floor(t * 6 + x + j * 3)) % GL.length], x, y);
      }
    }
  };
  // sakura, drifting
  const petals = (g, w, h, t, col, n) => {
    const r = seeded(33);
    for (let i = 0; i < n; i++) {
      const sp = 14 + r() * 26, x = ((r() * w + t * sp) % (w + 20)) - 10, y = ((r() * h + t * sp * 0.4) % (h * 0.8));
      g.save(); g.translate(x, y); g.rotate(t * (1 + r()) + i);
      g.fillStyle = css(col, 0.5 + 0.4 * r());
      g.beginPath(); g.ellipse(0, 0, 2.6, 1.4, 0, 0, TAU); g.fill();
      g.restore();
    }
  };
  const metalHex = (hi, mid, lo) => metal(hi, mid, lo);
  const FIRE = metalHex('#ffedd5', '#fb923c', '#7c2d12'), GOLDEN = METAL.gold;
  const BLOOD = metalHex('#fee2e2', '#ef4444', '#450a0a'), CODE = metalHex('#ecfccb', '#a3e635', '#1a2e05');
  const VIOLET = metalHex('#ede9fe', '#a78bfa', '#2e1065'), PINK = metalHex('#fce7f3', '#f472b6', '#500724');

  /* SUPPORTER, a Patreon supporter's looks (the 'supporter' gate): the void's
     light turned warm, coral, amber and rose going round; lanterns rising,
     every one a supporter's; and a heart cut like a stone, which the picture
     and the decal both carry, beating. */
  const KINDLE = ['#ff7a66', '#fcd34d', '#f472b6'].map(rgb);
  const kindled = u => {
    u = (((u % 1) + 1) % 1) * 3;
    const i = Math.floor(u);
    return lerp(KINDLE[i], KINDLE[(i + 1) % 3], u - i);
  };
  // the supporter's metal: rose gold, coral at heart
  const PATRON = metalHex('#fff4ee', '#ff8a70', '#5e1a24');
  // a metal out of the warm light at u, for a facet
  const warmTint = u => { const c = kindled(u); return { hi: lerp(c, [255, 255, 255], 0.72), mid: c, lo: lerp(c, [36, 4, 16], 0.72) }; };
  // a heart's beat, lub-dub, every 1.2 s: 1 on the first, 0.6 on the second, 0 between
  const BEAT = 1.2;
  const heartbeat = t => {
    if (STILL) return 0;
    const ph = (t % BEAT) / BEAT, kick = (at, len) => (ph < at ? 0 : Math.pow(1 - Math.min(1, (ph - at) / len), 3));
    return Math.max(kick(0, 0.16), 0.6 * kick(0.2, 0.2));
  };
  // a sky lantern, (x, y) its middle, s tall, in colour c: paper lit by the flame in its mouth
  const lantern = (g, x, y, s, c, a, f) => {
    glow(g, x, y + s * 0.15, s * 1.6, c, 0.32 * a * f);
    if (s < 4) {
      g.fillStyle = css(lerp(c, [255, 250, 235], 0.35), a);
      g.fillRect(x - s * 0.3, y - s * 0.5, s * 0.6, s);
      return;
    }
    const top = s * 0.34, foot = s * 0.24, hh = s * 0.5;
    g.beginPath();
    g.moveTo(x - foot, y + hh);
    g.lineTo(x - top, y - hh + s * 0.1);
    g.quadraticCurveTo(x, y - hh - s * 0.08, x + top, y - hh + s * 0.1);
    g.lineTo(x + foot, y + hh);
    g.closePath();
    const paper = g.createLinearGradient(0, y - hh, 0, y + hh);
    paper.addColorStop(0, css(lerp(c, [60, 12, 24], 0.45), a));
    paper.addColorStop(0.62, css(c, a));
    paper.addColorStop(1, css(lerp(c, [255, 250, 235], 0.65), a));
    g.fillStyle = paper; g.fill();
    if (s > 9) {                                     // its ribs
      g.strokeStyle = css(lerp(c, [40, 8, 16], 0.5), 0.35 * a); g.lineWidth = 0.7;
      g.beginPath();
      for (const k of [-0.36, 0.36]) { g.moveTo(x + top * k, y - hh + s * 0.04); g.lineTo(x + foot * k, y + hh); }
      g.stroke();
    }
    g.fillStyle = 'rgba(255,248,230,' + 0.95 * a * f + ')';     // the flame, a bead in its mouth
    g.beginPath(); g.ellipse(x, y + hh - s * 0.03, foot * 0.55, Math.max(0.6, s * 0.05), 0, 0, TAU); g.fill();
  };
  /* o.n lanterns rising from y0 up to `top` across x0 to x0 + w, drifting on
     a slow wind and swaying; z is how near (o.z0 to o.z1): nearer ones
     bigger, brighter and quicker. o.sc scales them (1 on a 200-tall cover). */
  const lanterns = (g, x0, y0, w, top, t, o) => {
    const r = seeded(o.seed || 5), sc = o.sc || 1;
    for (let i = 0; i < o.n; i++) {
      const z = o.z0 + (o.z1 - o.z0) * r(), xr = r(), ph = r(), u = r();
      const s = sc * (2 + 10 * z), sp = sc * (2.5 + 9 * z), span = y0 - top + s * 2;
      const y = y0 + s - ((ph * span + t * sp) % span);
      const wide = w + s * 4, x = x0 - s * 2 + ((xr * wide + t * sc * 1.6 * z) % wide) + Math.sin(t * 0.5 + ph * TAU) * sc * 3 * z;
      const a = (0.4 + 0.5 * Math.min(1, z)) * clamp01((y0 - y) / (s * 3)) * clamp01((y - top) / ((y0 - top) * 0.35));
      if (a <= 0.01) continue;
      const f = STILL ? 1 : 0.82 + 0.18 * Math.sin(t * (6 + 3 * z) + i * 1.7);
      lantern(g, x, y, s, kindled(u + t * 0.02), a, f);
    }
  };
  // the heart, cut like a stone: 12 corners clockwise from the notch, 32 across on a 40 grid
  const HEART = [[0, -8], [5, -14], [11, -14.5], [15.5, -10], [16, -4], [12, 3.5], [0, 14.5],
                 [-12, 3.5], [-16, -4], [-15.5, -10], [-11, -14.5], [-5, -14]];
  const HEART_R = [0.6, 2.4, 2.8, 2.8, 2.4, 2, 1.2, 2, 2.4, 2.8, 2.8, 2.4];
  const HEART_IN = HEART.map(([x, y]) => [x * 0.5, y * 0.5 - 1.6]);
  /* Its facets lit from up and to the left as it sways, each in its own part
     of the warm light, which drifts round; the table on top catches the
     light; a glint now and then and a sparkle hopping over it. */
  const heartGem = (g, t, age) => {
    const drift = STILL ? 0 : t * 0.05, sway = STILL ? 0 : Math.sin(t * 0.8) * 0.3, n = HEART.length;
    const outline = () => roundPath(g, HEART, HEART_R);
    outline();
    g.fillStyle = css(PATRON.mid); g.fill();
    g.save();
    outline(); g.clip();
    for (let i = 0; i < n; i++) {
      const a = HEART[i], b = HEART[(i + 1) % n], c = HEART_IN[(i + 1) % n], d = HEART_IN[i];
      const k = facing(Math.atan2(-(b[0] - a[0]), b[1] - a[1]) + sway), M = warmTint(i / n * 0.5 + drift);
      for (const [p, q, rr, dk] of [[a, b, d, 0.09], [b, c, d, -0.09]]) {
        g.beginPath(); g.moveTo(p[0], p[1]); g.lineTo(q[0], q[1]); g.lineTo(rr[0], rr[1]); g.closePath();
        g.fillStyle = css(lit(M, clamp01(k + dk))); g.fill();
      }
    }
    roundPath(g, HEART_IN, 1);
    const T = warmTint(drift + 0.25), tb = g.createLinearGradient(-6, -10, 6, 7);
    tb.addColorStop(0, css(T.hi)); tb.addColorStop(1, css(lit(T, 0.55 + sway * 0.3)));
    g.fillStyle = tb; g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 0.5;
    g.beginPath();
    for (let i = 0; i < n; i++) { g.moveTo(HEART_IN[i][0], HEART_IN[i][1]); g.lineTo(HEART[i][0], HEART[i][1]); }
    g.stroke();
    g.restore();
    outline();
    g.strokeStyle = css(PATRON.hi, 0.8); g.lineWidth = 0.8; g.stroke();
    glint(g, age + 1.2, 4.6, outline, -16, 16, -15, 15, 0.6);
    if (!STILL) {
      const spots = [[-9, -9], [8, -3], [-2, 7]], j = Math.floor(t / 1.6) % 3, u = (t % 1.6) / 1.6;
      g.save();
      g.globalAlpha *= Math.sin(u * Math.PI);
      sparkle(g, spots[j][0], spots[j][1], 3.4);
      g.fillStyle = '#fff'; g.fill();
      g.restore();
    }
  };
  // the heart's outline going out on each beat, two at a time as they fade
  const heartRipples = (g, t, a) => {
    if (STILL) return;
    const ph = (t % BEAT) / BEAT;
    for (let j = 0; j < 2; j++) {
      const k = (ph + j) / 2, sc = 1.04 + outQuint(k) * 0.75;
      g.save(); g.scale(sc, sc);
      roundPath(g, HEART, HEART_R);
      g.strokeStyle = css(kindled(t * 0.05 + 0.3), 0.5 * (1 - k) * a); g.lineWidth = 1.5 / sc;
      g.stroke();
      g.restore();
    }
  };

  const BANNER = {
    // VOIDRUNNER: rings pulsing out over the grid, and the ship
    runner: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'runner', M: pilotOf('runner').M, back: (g, w, h, t, hz) => {
      const cx = w * 0.3, cy = hz - h * 0.18;
      for (let i = 0; i < 5; i++) {
        const q = STILL ? i / 5 : ((t * 0.25 + i / 5) % 1);
        g.strokeStyle = css(pilotOf('runner').M.mid, 0.4 * (1 - q)); g.lineWidth = 1.5;
        g.beginPath(); g.ellipse(cx, cy, q * w * 0.4, q * h * 0.5, 0, 0, TAU); g.stroke();
      }
      glow(g, cx, cy, h * 0.3, pilotOf('runner').M.hi, 0.25);
      heroShip(g, w, h, t, hz, pilotOf('runner'), false);
    } }),
    // EMBER: the horizon burning, embers rising
    ember: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'ember', M: pilotOf('ember').M, back: (g, w, h, t, hz) => {
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let x = 0; x < w; x += 10) {
        const f = 0.5 + 0.5 * Math.sin(x * 0.07 + t * 3) * Math.sin(x * 0.031 - t * 1.7), fh = h * (0.08 + 0.18 * f);
        const gr = g.createLinearGradient(0, hz - fh, 0, hz);
        gr.addColorStop(0, 'rgba(251,146,60,0)'); gr.addColorStop(1, 'rgba(251,146,60,0.35)');
        g.fillStyle = gr; g.fillRect(x, hz - fh, 10, fh);
      }
      g.restore();
      embers(g, w, h, t, hz, rgb('#fdba74'), 50);
      heroShip(g, w, h, t, hz, pilotOf('ember'), false);
    } }),
    // THE HACKER: code falling behind the ship
    hacker: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'hacker', M: CODE, stars: 30, back: (g, w, h, t, hz) => {
      codeRain(g, w, hz, t, CODE.mid, 0.4, 16);
      heroShip(g, w, h, t, hz, pilotOf('hacker'), false);
    } }),
    // THE VAGRANT: a pale moon, sakura, and the ship
    vagrant: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'vagrant', M: pilotOf('melee').M, back: (g, w, h, t, hz) => {
      const mx = w * 0.26, my = hz - h * 0.38, mr = h * 0.24;
      glow(g, mx, my, mr * 2.4, rgb('#e0e7ff'), 0.25);
      g.fillStyle = '#e0e7ff'; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
      g.fillStyle = 'rgba(165,180,252,0.35)'; g.beginPath(); g.arc(mx - mr * 0.3, my - mr * 0.2, mr * 0.2, 0, TAU); g.arc(mx + mr * 0.25, my + mr * 0.3, mr * 0.13, 0, TAU); g.fill();
      petals(g, w, h, t, rgb('#f9a8d4'), 26);
      heroShip(g, w, h, t, hz, pilotOf('melee'), false);
    } }),
    // OVERDRIVE: a fire's heart behind the horizon, flames reaching up from it
    overdrive: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'overdrive', M: FIRE, top: '#1a0702', tint: 0.6, back: (g, w, h, t, hz) => {
      const cx = w * 0.35, cy = hz;
      glow(g, cx, cy, h * 1.1, FIRE.mid, 0.45);
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 18; i++) {
        const a = Math.PI + (i + 0.5) / 18 * Math.PI, f = STILL ? 0.7 : 0.55 + 0.45 * Math.sin(t * 6 + i * 2.1);
        const L = h * (0.35 + 0.35 * f);
        g.strokeStyle = css(lit(FIRE, 0.4 + 0.5 * f), 0.35); g.lineWidth = 6; g.lineCap = 'round';
        g.beginPath(); g.moveTo(cx + Math.cos(a) * h * 0.12, cy + Math.sin(a) * h * 0.12);
        g.quadraticCurveTo(cx + Math.cos(a) * L * 0.6 + Math.sin(t * 3 + i) * 6, cy + Math.sin(a) * L * 0.6, cx + Math.cos(a) * L, cy + Math.sin(a) * L);
        g.stroke();
      }
      g.restore();
      embers(g, w, h, t, hz, rgb('#fed7aa'), 70);
      heroShip(g, w, h, t, hz, pilotOf('ember'), true);
    } }),
    // SUPERUSER: gold rings of bits turning round a seal, gold code behind
    superuser: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'superuser', M: GOLDEN, top: '#120c02', tint: 0.5, stars: 40, back: (g, w, h, t, hz) => {
      codeRain(g, w, hz, t, GOLDEN.mid, 0.22, 18);
      const cx = w * 0.3, cy = hz - h * 0.3;
      glow(g, cx, cy, h * 0.5, GOLDEN.mid, 0.3);
      for (let k = 0; k < 3; k++) {
        const R = h * (0.16 + k * 0.1), n = 18 + k * 8, sp = (k % 2 ? -1 : 1) * (0.4 - k * 0.08);
        g.strokeStyle = css(GOLDEN.hi, 0.35); g.lineWidth = 1;
        g.beginPath(); g.ellipse(cx, cy, R * 1.6, R, 0, 0, TAU); g.stroke();
        for (let i = 0; i < n; i++) {
          const a = i / n * TAU + t * sp;
          g.fillStyle = css(GOLDEN.hi, i % 3 ? 0.4 : 0.9);
          g.fillRect(cx + Math.cos(a) * R * 1.6 - 1, cy + Math.sin(a) * R - 1, 2, 2);
        }
      }
      heroShip(g, w, h, t, hz, pilotOf('hacker'), true);
    } }),
    // RONIN: a blood moon, red petals, crescents cut through the sky
    ronin: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'ronin', M: BLOOD, top: '#120203', tint: 0.55, back: (g, w, h, t, hz) => {
      const mx = w * 0.26, my = hz - h * 0.36, mr = h * 0.26;
      glow(g, mx, my, mr * 2.6, BLOOD.mid, 0.4);
      const mg = g.createRadialGradient(mx - mr * 0.3, my - mr * 0.3, mr * 0.1, mx, my, mr);
      mg.addColorStop(0, '#fca5a5'); mg.addColorStop(1, '#991b1b');
      g.fillStyle = mg; g.beginPath(); g.arc(mx, my, mr, 0, TAU); g.fill();
      for (let i = 0; i < 3; i++) {
        const q = STILL ? 0.5 : ((t * 0.3 + i / 3) % 1), a = 1 - Math.abs(q * 2 - 1);
        g.strokeStyle = 'rgba(254,226,226,' + 0.6 * a + ')'; g.lineWidth = 2;
        g.beginPath(); g.arc(w * (0.45 + i * 0.18), hz - h * (0.3 + i * 0.12), h * 0.3, -2.4 + q, -1.2 + q); g.stroke();
      }
      petals(g, w, h, t, rgb('#fca5a5'), 30);
      heroShip(g, w, h, t, hz, pilotOf('melee'), true);
    } }),
    // THE CROWN: a star in a wreath, rays turning behind it
    crown: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'crown', M: GOLDEN, top: '#0c0802', tint: 0.45, back: (g, w, h, t, hz) => {
      const cx = w * 0.5, cy = hz - h * 0.34;
      g.save(); g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 12; i++) {
        const a = i / 12 * TAU + t * 0.08;
        g.fillStyle = css(GOLDEN.mid, 0.07);
        g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, w, a, a + 0.12); g.closePath(); g.fill();
      }
      g.restore();
      glow(g, cx, cy, h * 0.5, GOLDEN.hi, 0.3);
      g.save(); g.translate(cx, cy);
      g.strokeStyle = css(GOLDEN.hi, 0.9); g.fillStyle = css(GOLDEN.hi, 0.9); g.lineWidth = 2;
      MARK.all(g, h * 0.3, t);
      g.restore();
    } }),
    // THE LADDER: the player's league crest, lifted on beams (gold until they have one)
    ladder: (g, w, h, t, p) => {
      const id = p.league || 'gold', M = metalOf(id);
      coverStage(g, w, h, t, p, { id: 'ladder', M, back: (g, w, h, t, hz, r, age) => {
        const cx = w * 0.5, cy = hz - h * 0.36;
        g.save(); g.globalCompositeOperation = 'lighter';
        for (let i = -3; i <= 3; i++) {
          const bx = cx + i * w * 0.09, bw = 10 + Math.abs(i) * 2;
          const gr = g.createLinearGradient(0, 0, 0, hz);
          gr.addColorStop(0, css(M.mid, 0)); gr.addColorStop(1, css(M.mid, 0.16 / (1 + Math.abs(i))));
          g.fillStyle = gr; g.fillRect(bx - bw / 2, 0, bw, hz);
        }
        g.restore();
        g.save(); g.translate(cx, cy); g.scale(h / 64 * 0.62, h / 64 * 0.62);
        crestOf(g, id, t, age + 1);
        g.restore();
      } });
    },
    /* SUPPORTER: a beacon on the horizon, its beam swinging slowly over the
       sky, lanterns rising past the player's own ship (the one they last
       flew), the far ones from behind the horizon and a few near ones off
       the floor. */
    supporter: (g, w, h, t, p) => coverStage(g, w, h, t, p, { id: 'supporter', M: PATRON, top: '#12060c', tint: 0.5, stars: 70,
      back: (g, w, h, t, hz) => {
        const sc = h / 200, bx = w * 0.2, by = hz - h * 0.44, warm = kindled(t * 0.03);
        // the beam
        const ang = -Math.PI / 2 + (STILL ? -0.55 : Math.sin(t * 0.32) * 1.05), L = Math.hypot(w, h);
        g.save();
        g.globalCompositeOperation = 'lighter';
        const bg = g.createRadialGradient(bx, by, 0, bx, by, L * 0.75);
        bg.addColorStop(0, css(warm, 0.22)); bg.addColorStop(1, css(warm, 0));
        g.fillStyle = bg;
        for (const sp of [0.12, 0.04]) {
          g.beginPath(); g.moveTo(bx, by); g.arc(bx, by, L, ang - sp, ang + sp); g.closePath(); g.fill();
        }
        g.restore();
        // the far lanterns, rising from behind the horizon
        g.save();
        g.beginPath(); g.rect(0, 0, w, hz); g.clip();
        lanterns(g, 0, hz, w, 0, t, { n: Math.round(14 + 20 * Math.min(1, w / 1200)), z0: 0.2, z1: 0.75, sc, seed: 11 });
        g.restore();
        // the beacon: a dark spire lit down its left edge, bands of light up it, the lamp at its top
        const b0 = Math.max(4, h * 0.032), b1 = Math.max(1.4, h * 0.009), lampY = by + h * 0.03;
        g.beginPath();
        g.moveTo(bx - b0, hz); g.lineTo(bx - b1, lampY); g.lineTo(bx + b1, lampY); g.lineTo(bx + b0, hz);
        g.closePath();
        const sg = g.createLinearGradient(bx - b0, 0, bx + b0, 0);
        sg.addColorStop(0, css(lerp(PATRON.mid, [12, 4, 10], 0.5))); sg.addColorStop(0.42, '#16080f'); sg.addColorStop(1, '#07030a');
        g.fillStyle = sg; g.fill();
        for (let j = 1; j <= 3; j++) {
          const k = j / 4.2, y = hz - (hz - lampY) * k, half = b0 + (b1 - b0) * k;
          g.fillStyle = css(PATRON.hi, 0.18 + 0.1 * j); g.fillRect(bx - half, y, half * 2, Math.max(1, sc));
        }
        g.fillStyle = '#0c050a';                     // its cap
        g.beginPath(); g.moveTo(bx - b1 * 2.4, by - h * 0.018); g.lineTo(bx, by - h * 0.07); g.lineTo(bx + b1 * 2.4, by - h * 0.018); g.closePath(); g.fill();
        const pulse = STILL ? 0.8 : 0.7 + 0.3 * Math.sin(t * 2.2);
        glow(g, bx, by, h * 0.5, warm, 0.34 * pulse);
        glow(g, bx, by, h * 0.12, [255, 244, 230], 0.8);
        g.save();
        g.globalCompositeOperation = 'lighter';
        sparkle(g, bx, by, h * 0.1 * (0.8 + 0.2 * pulse));
        g.fillStyle = css(lerp(warm, [255, 255, 255], 0.6), 0.6); g.fill();
        g.restore();
        g.fillStyle = '#fff7ed';
        g.beginPath(); g.arc(bx, by, Math.max(1.8, h * 0.016), 0, TAU); g.fill();
        heroShip(g, w, h, t, hz, pilotOf(p.pilot), false);
      },
      front: (g, w, h, t, hz) => {
        const sc = h / 200, bx = w * 0.2;
        // the beacon's light, pooled on the floor at its foot
        g.save();
        g.translate(bx, hz); g.scale(1, 0.28);
        glow(g, 0, 0, h * 0.45, kindled(t * 0.03), 0.3);
        g.restore();
        // a few near lanterns, off the floor
        lanterns(g, 0, h + 24 * sc, w, 0, t, { n: Math.round(3 + 3 * Math.min(1, w / 1200)), z0: 1.1, z1: 1.6, sc, seed: 29 });
      } })
  };

  /* A picture: the sigil's cut (a rounded square that pops in) with o.inner
     drawn in it on its own colours and triangles, a glint, and the rim in the
     player's league metal, lit by a running light once they are placed. */
  const pictureFrame = (g, w, h, t, p, o) => {
    const S = Math.min(w, h) - 2, x0 = (w - S) / 2, y0 = (h - S) / 2, cr = S * 0.2, M = metalOf(p.league);
    const age = life(g, t, (p.user || p.display || '') + ':' + o.id), k = outBack(age / 0.7);
    g.save();
    g.translate(w / 2, h / 2); g.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); g.translate(-w / 2, -h / 2);
    g.globalAlpha = clamp01(age / 0.25);
    const box = () => rrect(g, x0, y0, S, S, cr);
    g.save();
    box(); g.clip();
    const bg = g.createLinearGradient(x0, y0, x0 + S, y0 + S);
    bg.addColorStop(0, css(lerp(o.M.mid, [6, 8, 16], 0.55))); bg.addColorStop(1, css(lerp(o.M.lo, [6, 8, 16], 0.6)));
    g.fillStyle = bg; g.fillRect(x0, y0, S, S);
    triangles(g, x0, y0, S, S, t, { n: 10, lo: S * 0.06, hi: S * 0.22, speed: 6, col: o.M.hi, alpha: 0.08, seed: 21 });
    o.inner(g, w / 2, h / 2, S, t, age);
    const vg = g.createRadialGradient(w / 2, h / 2, S * 0.3, w / 2, h / 2, S * 0.78);
    vg.addColorStop(0, 'rgba(4,6,12,0)'); vg.addColorStop(1, 'rgba(4,6,12,0.5)');
    g.fillStyle = vg; g.fillRect(x0, y0, S, S);
    glint(g, age + 0.2, 6.5, box, x0, x0 + S, y0, y0 + S, 0.22);
    g.restore();
    rrect(g, x0 + 1.25, y0 + 1.25, S - 2.5, S - 2.5, cr - 1.25);
    const rim = g.createLinearGradient(x0, y0, x0 + S * 0.4, y0 + S);
    rim.addColorStop(0, css(M.hi)); rim.addColorStop(0.5, css(M.mid)); rim.addColorStop(1, css(M.lo));
    g.strokeStyle = rim; g.lineWidth = 2.5; g.stroke();
    if (!STILL && p.league && g.createConicGradient) {
      const run = g.createConicGradient(t * 0.8, w / 2, h / 2);
      run.addColorStop(0, css(M.hi, 0)); run.addColorStop(0.06, css(M.hi, 0.9)); run.addColorStop(0.12, css(M.hi, 0));
      run.addColorStop(1, css(M.hi, 0));
      g.strokeStyle = run; g.lineWidth = 2.5; g.stroke();
    }
    g.restore();
  };
  // a pilot's picture: its ship big in the middle, and awake, its aura round it
  const pilotPicture = (pid, awake) => (g, w, h, t, p) => {
    const P = pilotOf(pid);
    pictureFrame(g, w, h, t, p, { id: (awake ? 'awake-' : '') + pid, M: awake ? metal(P.awake === '#fbbf24' ? '#fff5c4' : '#fee2e2', P.awake, '#1c0a04') : P.M,
      inner: (g, cx, cy, S, t) => {
        g.save(); g.translate(cx, cy); g.scale(S / 64, S / 64);
        if (awake) aura(g, P, t, 23, false);
        else glow(g, 0, 0, 30, P.M.mid, 0.25);
        pilotShip(g, P, 0, 1.5, 34, t, { glow: 8, awake });
        g.restore();
      } });
  };
  // a league's picture: its crest
  const leaguePicture = id => (g, w, h, t, p) => pictureFrame(g, w, h, t, p, { id: 'league-' + id, M: metalOf(id),
    inner: (g, cx, cy, S, t, age) => { g.save(); g.translate(cx, cy + S * 0.02); g.scale(S / 64 * 0.82, S / 64 * 0.82); crestOf(g, id, t, age + 0.5); g.restore(); } });
  const PICTURE = {
    runner: pilotPicture('runner'), ember: pilotPicture('ember'), hacker: pilotPicture('hacker'), vagrant: pilotPicture('melee'),
    overdrive: pilotPicture('ember', true), superuser: pilotPicture('hacker', true), ronin: pilotPicture('melee', true),
    bronze: leaguePicture('bronze'), silver: leaguePicture('silver'), gold: leaguePicture('gold'),
    platinum: leaguePicture('platinum'), void: leaguePicture('void'),
    // SUPPORTER: the heart, beating, its outline going out on each beat, lanterns rising behind it
    supporter: (g, w, h, t, p) => pictureFrame(g, w, h, t, p, { id: 'supporter', M: PATRON,
      inner: (g, cx, cy, S, t, age) => {
        const on = clamp01((age - 0.5) / 0.4), beat = heartbeat(t) * on;
        g.save();
        g.translate(cx, cy); g.scale(S / 64, S / 64);
        lanterns(g, -32, 40, 64, -34, t, { n: 7, z0: 0.2, z1: 0.5, sc: 0.9, seed: 7 });
        glow(g, 0, 1, 36, kindled(t * 0.05), 0.3 + 0.18 * beat);
        g.translate(0, 1.5);
        g.scale(1.12, 1.12);
        heartRipples(g, t, on);
        g.scale(1 + 0.05 * beat, 1 + 0.05 * beat);
        heartGem(g, t, age);
        g.restore();
      } })
  };

  /* The decals: a beveled hexagon in a metal with a mark sunk in its face,
     each by the catalog's id. On a 40 grid. */
  const GLYPH = {
    ship(g) { ship(g, 0, 0.5, 8.5); g.fill(); },
    check(g) { g.lineWidth = 2.6; g.lineCap = 'round'; g.lineJoin = 'round'; g.beginPath(); g.moveTo(-6, 0.5); g.lineTo(-1.5, 5); g.lineTo(6.5, -5); g.stroke(); },
    crown(g) { roundPath(g, [[-8, 5], [-8, -4], [-4, 0], [0, -7], [4, 0], [8, -4], [8, 5]], 0.8); g.fill(); },
    code(g) { g.font = "700 9px 'Chakra Petch', 'JetBrains Mono', monospace"; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('</>', 0, 0.5); },
    wreath(g, t) { g.lineWidth = 1.2; MARK.all(g, 10, t); },
    duel(g, t) { g.lineWidth = 1.6; MARK.pvp(g, 10, t); },
    chevrons(g, t, M) { g.save(); g.scale(0.85, 0.85); chevrons(g, 3, M); g.restore(); },
    eye(g, t) {
      g.beginPath(); g.moveTo(-8, 0); g.quadraticCurveTo(0, -7, 8, 0); g.quadraticCurveTo(0, 7, -8, 0); g.closePath(); g.fill();
      g.fillStyle = '#7f1d1d'; g.beginPath(); g.arc(0, 0, 3.2, 0, TAU); g.fill();
      g.fillStyle = '#fee2e2'; g.beginPath(); g.arc(-1, -1, 0.9, 0, TAU); g.fill();
    },
    star(g) { sparkle(g, 0, 0, 8); g.fill(); },
    // SUPPORTER: the heart, beating, its table catching the light and its cuts showing
    heart(g, t, M) {
      const k = 0.5 * (1 + 0.08 * heartbeat(t));
      g.save();
      g.scale(k, k);
      roundPath(g, HEART, HEART_R); g.fill();
      g.shadowBlur = 0;
      roundPath(g, HEART_IN, 1);
      g.fillStyle = 'rgba(255,255,255,0.3)'; g.fill();
      g.strokeStyle = css(M.lo, 0.4); g.lineWidth = 1.1;
      g.beginPath();
      for (let i = 0; i < HEART.length; i++) { g.moveTo(HEART_IN[i][0], HEART_IN[i][1]); g.lineTo(HEART[i][0], HEART[i][1]); }
      g.stroke();
      g.restore();
    }
  };
  const DECAL = {
    founder:   { M: METAL.cyan, glyph: 'ship' },
    tester:    { M: VIOLET, glyph: 'check' },
    champion:  { M: METAL.gold, glyph: 'crown' },
    developer: { M: METAL.void, glyph: 'code' },
    crown:     { M: METAL.gold, glyph: 'wreath' },
    duelist:   { M: PINK, glyph: 'duel' },
    veteran:   { M: METAL.silver, glyph: 'chevrons' },
    awakened:  { M: BLOOD, glyph: 'eye' },
    supporter: { M: PATRON, glyph: 'heart' }
  };

  window.LB_ART = {

    /* The page's colours, fonts and corner radius. Each key is a CSS variable
       (--bg, --cyan…) that leaderboard.css reads; leave one out and the
       stylesheet's own value stands. */
    theme: {
      'bg': '#05060a',
      'panel': 'rgba(9, 14, 25, .86)',
      'row': '#0c1321',                     // the rows' panels: keep these solid
      'row-hi': '#16213a',
      'line': 'rgba(103, 232, 249, .18)',
      'line-hi': 'rgba(103, 232, 249, .6)',
      'cyan': '#67e8f9',
      'pink': '#f472b6',
      'ink': '#e2e8f0',
      'text': '#cbd5e1',
      'dim': '#64748b',
      'faint': '#334155',
      'gold': '#fbbf24',
      'silver': '#cbd5e1',
      'bronze': '#e08a46',
      'platinum': '#67e8f9',
      'void': '#c084fc',
      'bad': '#f87171',
      'radius': '12px'
    },

    /* The void behind the page: a cyan light high on the left and a violet
       one low on the right, osu!'s triangles rising through it, stars, and a
       vignette. */
    backdrop(g, w, h, t) {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#080b17');
      sky.addColorStop(0.6, '#05070e');
      sky.addColorStop(1, '#04050a');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);
      const big = Math.max(w, h);
      glow(g, w * 0.2, h * 0.02, big * 0.6, rgb('#67e8f9'), 0.075 + 0.015 * Math.sin(t * 0.3));
      glow(g, w * 0.92, h * 0.9, big * 0.55, rgb('#a78bfa'), 0.055 + 0.015 * Math.sin(t * 0.23 + 2));

      triangles(g, 0, 0, w, h, t, { n: 40, lo: 22, hi: Math.min(170, big * 0.13), speed: 13,
                                    col: [150, 200, 255], alpha: 0.045, seed: 3, line: 5 });

      const r = seeded(1337);
      for (let i = 0; i < 150; i++) {
        const sx = r(), sy = r(), z = 0.2 + r() * 0.8, p = r() * TAU;
        const x = ((sx * w - t * 5 * z) % w + w) % w;
        const y = ((sy * h + t * 2 * z) % h + h) % h;
        const a = 0.15 + 0.5 * z * (0.6 + 0.4 * Math.sin(t * 1.3 + p));
        const s = z > 0.85 ? 1.4 : 0.9;
        g.fillStyle = z > 0.85 ? rgba('#a5f3fc', a) : rgba('#cbd5e1', a * 0.7);
        g.fillRect(x - s / 2, y - s / 2, s, s);
      }

      const vig = g.createRadialGradient(w / 2, h * 0.45, Math.min(w, h) * 0.3, w / 2, h * 0.45, big * 0.78);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.6)');
      g.fillStyle = vig;
      g.fillRect(0, 0, w, h);
    },

    /* The emblem, after osu!'s main-menu logo: a disc that kicks on the beat
       and sends a ripple out every other one, triangles rising inside it, a
       cyan-to-pink rim, and the pilot's delta in the middle. */
    crest(g, w, h, t) {
      const x = w / 2, y = h / 2, R = Math.min(w, h) * 0.37;
      const age = life(g, t);
      const beat = 60 / 112, ph = (t % beat) / beat;
      const on = clamp01((age - 0.7) / 0.4);
      const kick = Math.pow(1 - ph, 4) * on;

      for (let i = 0; i < 2; i++) {               // the ripples
        const k = ((t / (beat * 2)) + i / 2) % 1;
        g.strokeStyle = rgba('#67e8f9', 0.3 * (1 - k) * on);
        g.lineWidth = 0.6 + 1.6 * (1 - k);
        g.beginPath(); g.arc(x, y, R * (1.02 + outQuint(k) * 0.3), 0, TAU); g.stroke();
      }

      g.save();
      g.translate(x, y);
      const sc = (0.5 + 0.5 * outBack(age / 0.8)) * (1 + 0.035 * kick);
      g.scale(sc, sc);
      g.globalAlpha = clamp01(age / 0.25);
      glow(g, 0, 0, R * 1.28, rgb('#67e8f9'), 0.16 + 0.1 * kick);

      g.beginPath(); g.arc(0, 0, R, 0, TAU);
      const disc = g.createRadialGradient(0, -R * 0.4, 0, 0, 0, R);
      disc.addColorStop(0, '#16243e'); disc.addColorStop(1, '#070b16');
      g.fillStyle = disc; g.fill();
      g.save();
      g.clip();
      triangles(g, -R, -R, R * 2, R * 2, t, { n: 14, lo: 5, hi: 17, speed: 8, col: [103, 232, 249], alpha: 0.16, seed: 21 });
      g.restore();

      const a0 = t * 0.5;
      const rim = g.createLinearGradient(Math.cos(a0) * R, Math.sin(a0) * R, -Math.cos(a0) * R, -Math.sin(a0) * R);
      rim.addColorStop(0, '#67e8f9'); rim.addColorStop(1, '#f472b6');
      g.strokeStyle = rim; g.lineWidth = 3.2;
      g.beginPath(); g.arc(0, 0, R - 1.6, 0, TAU); g.stroke();

      roundPath(g, ngon(0, 0, R * 0.64, 6, t * 0.18 - Math.PI / 2), 3);
      g.strokeStyle = 'rgba(224,242,254,0.2)'; g.lineWidth = 1; g.stroke();

      g.shadowColor = '#67e8f9'; g.shadowBlur = 12 + 10 * kick;
      ship(g, 0, R * 0.04, R * 0.42);
      const body = g.createLinearGradient(0, -R * 0.4, 0, R * 0.4);
      body.addColorStop(0, '#ffffff'); body.addColorStop(1, '#67e8f9');
      g.fillStyle = body; g.fill();
      g.restore();

      if (!STILL && on) {                         // a satellite going round
        const a = t * 1.1;
        g.fillStyle = rgba('#f472b6', 0.9 * on);
        g.beginPath(); g.arc(x + Math.cos(a) * (R + 7), y + Math.sin(a) * (R + 7) * 0.92, 1.6, 0, TAU); g.fill();
      }
    },

    /* The top three on rounded cards, 2nd, 1st, 3rd: each rises into place
       one after another, its score counting up as it lands. Triangles rise in
       each card in its metal, its ship hovers over it, and 1st has two lights
       running round its edge. */
    podium(g, w, h, t, top) {
      if (!top || !top.length) return;
      const age = life(g, t, top);
      const gap = w < 560 ? 8 : 14;
      const cw = Math.min(216, (w - gap * 2) / 3);
      const small = cw < 150;
      const base = h - 3;
      const SPOT = { 1: { dx: 0, hk: 0.8, delay: 0 }, 2: { dx: -1, hk: 0.69, delay: 0.1 }, 3: { dx: 1, hk: 0.61, delay: 0.2 } };
      // places, not ranks: a tie for first still stands two cards
      for (const place of [2, 3, 1]) {             // 1st drawn last, over its neighbours' light
        const p = top[place - 1];
        if (!p) continue;
        const o = SPOT[place], first = place === 1;
        const age1 = age - o.delay;
        if (age1 <= 0) continue;
        const M = PLACE[Math.min(3, p.rank)] || METAL.cyan;
        const ch = Math.round(h * o.hk), cx = w / 2 + o.dx * (cw + gap);
        const x0 = cx - cw / 2, y0 = base - ch, cr = small ? 12 : 14;
        g.save();
        g.globalAlpha = clamp01(age1 / 0.3);
        g.translate(0, (1 - outQuint(age1 / 0.9)) * 42);

        // the light it stands in, a flat pool on its top edge, kept inside the canvas
        g.save();
        g.translate(cx, y0); g.scale(1, 0.3);
        glow(g, 0, 0, cw * 0.5, M.mid, first ? 0.32 : 0.2);
        g.restore();

        // the card
        const card = () => rrect(g, x0, y0, cw, ch, cr);
        card();
        const body = g.createLinearGradient(0, y0, 0, y0 + ch);
        body.addColorStop(0, css(lerp([13, 19, 34], M.mid, 0.26), 0.96));
        body.addColorStop(0.45, 'rgba(11,16,29,0.95)');
        body.addColorStop(1, 'rgba(7,10,19,0.97)');
        g.fillStyle = body; g.fill();
        g.save();
        card(); g.clip();
        triangles(g, x0, y0, cw, ch, t, { n: first ? 16 : 11, lo: 6, hi: small ? 22 : 32, speed: 9,
                                          col: M.mid, alpha: first ? 0.15 : 0.1, seed: place * 13 });
        g.restore();
        glint(g, age1 + place * 1.4, first ? 4 : 6, card, x0 - 20, x0 + cw + 20, y0, y0 + ch, 0.1);
        rrect(g, x0 + 0.5, y0 + 0.5, cw - 1, ch - 1, cr - 0.5);
        const edge = g.createLinearGradient(0, y0, 0, y0 + ch);
        edge.addColorStop(0, css(M.hi, 0.75)); edge.addColorStop(0.4, css(M.mid, 0.22)); edge.addColorStop(1, css(M.mid, 0.08));
        g.strokeStyle = edge; g.lineWidth = 1; g.stroke();
        if (first && !STILL && g.createConicGradient) {
          const run = g.createConicGradient(t * 0.9, cx, y0 + ch / 2);
          for (const c0 of [0, 0.5]) {
            run.addColorStop(c0, css(M.hi, 0));
            run.addColorStop(c0 + 0.06, css(M.hi, 0.95));
            run.addColorStop(c0 + 0.13, css(M.hi, 0));
          }
          g.strokeStyle = run; g.lineWidth = 1.6; g.stroke();
        }

        // the ship above it, its engine burning
        const ss = (first ? 11 : 9) * (small ? 0.85 : 1);
        const sy = y0 - (small ? 15 : 20) + (STILL ? 0 : Math.sin(t * 1.6 + place * 1.7) * 3);
        g.fillStyle = css(M.mid, 0.35 + 0.2 * Math.sin(t * 9 + place));
        g.beginPath();
        g.moveTo(cx - ss * 0.3, sy + ss * 0.5); g.lineTo(cx + ss * 0.3, sy + ss * 0.5);
        g.lineTo(cx, sy + ss * (1.25 + 0.25 * Math.sin(t * 14 + place)));
        g.fill();
        g.save();
        g.shadowColor = css(M.mid); g.shadowBlur = 12;
        ship(g, cx, sy, ss);
        g.fillStyle = '#070a12'; g.fill();
        g.strokeStyle = css(M.hi); g.lineWidth = 1.5; g.lineJoin = 'round'; g.stroke();
        g.restore();

        // the wave, the score above it, the name above that, and the badge
        // floating in the room left at the top
        g.textAlign = 'center'; g.textBaseline = 'middle';
        let ty = y0 + ch - (small ? 14 : 18);
        g.font = '500 ' + (small ? 9 : 10) + "px 'JetBrains Mono', monospace";
        g.fillStyle = 'rgba(148,163,184,0.9)';
        g.fillText('WAVE ' + (p.wave === null || p.wave === undefined ? '—' : p.wave) + (p.account ? '  ◆' : ''), cx, ty);
        ty -= small ? 17 : first ? 23 : 20;
        const roll = outQuint((age1 - 0.25) / 1.4);
        g.font = '700 ' + (small ? 14 : first ? 22 : 18) + "px 'Chakra Petch', 'JetBrains Mono', sans-serif";
        g.fillStyle = '#f8fafc';
        g.fillText(Math.round(Number(p.score) * roll).toLocaleString('en-US'), cx, ty);
        ty -= small ? 19 : first ? 26 : 23;
        g.font = '700 ' + (small ? 11 : first ? 15 : 13) + "px 'JetBrains Mono', monospace";
        g.fillStyle = first ? css(M.hi) : '#e2e8f0';
        g.fillText(fit(g, p.name, cw - 16), cx, ty);
        const bs = Math.round((first ? 42 : 34) * (small ? 0.78 : 1));
        const by = y0 + Math.max(bs / 2 + 8, (ty - y0 - 8) / 2);
        badge(g, cx, by, bs, M, String(p.rank), age1, place * 0.9);
        g.restore();
      }
    },

    /* A rounded badge in the place's metal, popping in a moment after its
       row arrives, with a glint across it now and then. */
    medal(g, w, h, t, rank) {
      const M = PLACE[rank] || METAL.cyan;
      const age = life(g, t) - 0.12 - rank * 0.05;
      if (age <= 0) return;
      const k = outBack(age / 0.5);
      g.translate(w / 2, h / 2);
      g.scale(k, k);
      badge(g, 0, 0, Math.min(w, h) - 2, M, String(rank), age, rank * 0.9);
    },

    /* Behind YOUR PLACEMENT: a wash of the place's colour, triangles rising
       on the right, a rounded bar down the left, and along the bottom how
       much of the board is behind you, filling as the card appears. */
    card(g, w, h, t, c) {
      const placed = c.rank > 0;
      const M = placed ? PLACE[c.rank] || METAL.cyan : null;
      const col = placed ? M.mid : [100, 116, 139];
      const age = life(g, t, c);
      const wash = g.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, css(col, placed ? 0.16 : 0.05)); wash.addColorStop(0.65, css(col, 0));
      g.fillStyle = wash; g.fillRect(0, 0, w, h);
      triangles(g, w * 0.4, 0, w * 0.6, h, t, { n: 12, lo: 6, hi: 26, speed: 7, col,
                                                alpha: placed ? 0.12 : 0.05, seed: { season: 5, all: 17, day: 29 }[c.board] || 0 });
      if (!placed) return;
      const k = outQuint((age - 0.15) / 0.6);
      g.save();
      g.shadowColor = css(M.mid); g.shadowBlur = 8;
      rrect(g, 6, h / 2 - (h / 2 - 12) * k, 3, (h - 24) * k, 1.5);
      g.fillStyle = css(M.mid); g.fill();
      g.restore();
      const share = c.of > 1 ? 1 - (c.rank - 1) / (c.of - 1) : 1;
      const bw = w - 28, fill = Math.max(3, bw * share * outQuint((age - 0.25) / 1.3));
      rrect(g, 14, h - 6, bw, 3, 1.5);
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
      rrect(g, 14, h - 6, fill, 3, 1.5);
      const bar = g.createLinearGradient(14, 0, 14 + bw, 0);
      bar.addColorStop(0, css(M.lo)); bar.addColorStop(1, css(M.hi));
      g.fillStyle = bar; g.fill();
      if (w >= 200) {                            // and in words, top right
        const pct = c.rank / Math.max(1, c.of) * 100;
        g.font = "700 10px 'Chakra Petch', sans-serif";
        if ('letterSpacing' in g) g.letterSpacing = '1.5px';
        g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillStyle = css(M.mid, 0.9 * clamp01((age - 0.4) / 0.4));
        g.fillText(c.rank === 1 ? 'TOP SPOT' : 'TOP ' + (pct < 1 ? '<1' : Math.ceil(pct)) + '%', w - 13, 17);
      }
    },

    /* Small scenes for a board with nothing to show. */
    empty(g, w, h, t, kind) {
      const x = w / 2, y = h / 2;
      g.lineCap = 'round'; g.lineJoin = 'round';
      if (kind === 'loading') {
        // osu!'s loading box: a rounded square turning a quarter at a time,
        // and an arc inside it spinning the other way
        const step = 0.6, n = Math.floor(t / step), f = outQuint((t % step) / step * 1.3);
        g.save();
        g.translate(x, y);
        g.rotate((n + f) * Math.PI / 2);
        rrect(g, -17, -17, 34, 34, 10);
        g.fillStyle = 'rgba(103,232,249,0.1)'; g.fill();
        g.strokeStyle = 'rgba(103,232,249,0.55)'; g.lineWidth = 1.5; g.stroke();
        g.restore();
        g.strokeStyle = '#67e8f9'; g.lineWidth = 2.4;
        g.beginPath(); g.arc(x, y, 7.5, -t * 5, -t * 5 + Math.PI * 1.25); g.stroke();
      } else if (kind === 'error') {
        // the signal, broken off either side of a warning
        g.strokeStyle = 'rgba(248,113,113,0.7)'; g.lineWidth = 1.6;
        for (const side of [-1, 1]) {
          g.beginPath();
          for (let i = 0; i <= 10; i++) {
            const px = x + side * (22 + i * 4.5);
            const jolt = (Math.floor(t * 8) + i) % 7 === 0 ? 4 : 0;
            const py = y + Math.sin(i * 0.9 + t * 4 * side) * 6 * (1 - i / 14) + jolt;
            i ? g.lineTo(px, py) : g.moveTo(px, py);
          }
          g.stroke();
        }
        const pop = outBack(life(g, t) / 0.5);
        g.save();
        g.translate(x, y); g.scale(pop, pop);
        rrect(g, -13, -13, 26, 26, 8);
        g.fillStyle = 'rgba(248,113,113,0.16)'; g.fill();
        g.strokeStyle = '#f87171'; g.lineWidth = 1.5; g.stroke();
        g.fillStyle = '#f87171';
        rrect(g, -1.5, -7.5, 3, 9, 1.5); g.fill();
        g.beginPath(); g.arc(0, 5.5, 1.8, 0, TAU); g.fill();
        g.restore();
      } else if (kind === 'pvp') {
        // two pilots sliding in to square up across a slanted VS plate
        const k = outQuint(life(g, t) / 0.9);
        const gap = 50 + (1 - k) * 46 + (STILL ? 0 : Math.sin(t * 1.5) * 3);
        for (const [dir, c] of [[1, '#67e8f9'], [-1, '#f472b6']]) {
          g.save();
          g.translate(x - dir * gap, y);
          g.rotate(dir * Math.PI / 2);
          g.fillStyle = rgba(c, 0.4 + 0.2 * Math.sin(t * 12));
          g.beginPath(); g.moveTo(-4, 6); g.lineTo(4, 6); g.lineTo(0, 15 + Math.sin(t * 15) * 2); g.fill();
          g.shadowColor = c; g.shadowBlur = 10;
          ship(g, 0, 0, 12);
          g.fillStyle = '#070a12'; g.fill();
          g.strokeStyle = c; g.lineWidth = 1.6; g.stroke();
          g.restore();
        }
        g.save();
        g.translate(x, y);
        g.scale(0.6 + 0.4 * k, 0.6 + 0.4 * k);
        g.globalAlpha = k;
        g.save();
        g.transform(1, 0, -0.28, 1, 0, 0);       // slanted, the way osu! slants its buttons
        rrect(g, -17, -11, 34, 22, 7);
        const plate = g.createLinearGradient(-17, 0, 17, 0);
        plate.addColorStop(0, '#67e8f9'); plate.addColorStop(1, '#f472b6');
        g.fillStyle = plate; g.fill();
        g.restore();
        g.font = "700 12px 'Chakra Petch', sans-serif";
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = '#05060a';
        g.fillText('VS', 0, 1);
        g.restore();
      } else {
        // 'empty': one ship drifting through triangles, nobody else out here
        triangles(g, 0, 0, w, h, t, { n: 9, lo: 6, hi: 18, speed: 6, col: [103, 232, 249], alpha: 0.09, seed: 40 });
        const sx = x + Math.sin(t * 0.6) * 28, sy = y + Math.cos(t * 0.8) * 6;
        g.setLineDash([1, 5]);
        g.strokeStyle = 'rgba(103,232,249,0.35)'; g.lineWidth = 1.4;
        g.beginPath(); g.moveTo(sx - 52, sy + 10); g.quadraticCurveTo(sx - 22, sy + 13, sx - 9, sy + 3); g.stroke();
        g.setLineDash([]);
        g.save();
        g.translate(sx, sy); g.rotate(Math.PI / 2 + Math.sin(t * 0.6) * 0.15);
        ship(g, 0, 0, 10);
        g.fillStyle = '#070a12'; g.fill();
        g.strokeStyle = '#67e8f9'; g.lineWidth = 1.4; g.stroke();
        g.restore();
      }
    },

    /* A league's crest, one family from Bronze to Void, each lit from the top
       left and growing with its step: Bronze a beveled hexagon with one
       chevron; Silver two and fins; Gold three, wings and a star; Platinum a
       cut gem, wings and a fan of blades; Void a black hole with a ring
       through it. Each pops in after the one before, and a glint crosses
       them now and then. */
    league(g, w, h, t, id) {
      const L = LEAGUE[id] || LEAGUE.bronze, M = L.M;
      const age = life(g, t) - L.tier * 0.09;
      if (age <= 0) return;
      const u = Math.min(w, h) / 64, k = outBack(age / 0.65);
      g.translate(w / 2, h / 2 + (L.tier >= 2 ? 2 : 0.5) * u);
      g.scale(u * k, u * k);
      g.globalAlpha = clamp01(age / 0.2);
      glow(g, 0, 0, 31, M.mid, (L.tier === 4 ? 0.3 : 0.2) + (STILL ? 0 : 0.06 * Math.sin(t * 1.6 + L.tier)));
      if (id === 'void') voidCrest(g, t, age, M);
      else if (id === 'platinum') gemCrest(g, t, age, M);
      else hexCrest(g, t, age, M, L.tier);
    },

    /* ============================ THE PROFILE ============================
       A player's page (#u/<account name>), after osu!'s: a cover across the
       top, the emblem standing half over it, the numbers under that, and the
       rest on rounded panels. The data each hook is handed is in the header
       above; ?hooks in the address (/leaderboard/?hooks#u/notz) outlines
       every canvas with its hook's name and size. */

    /* The cover, a world of the player's own: their name seeds where its
       nebulae hang, the colour beside the league's, and the planet's place
       and size. The planet is in their league's metal (gold and platinum
       ringed; the void a black hole), the arena's grid runs away to the
       horizon under it, three of the pilot they last flew cross the sky, and
       osu!'s triangles rise through it all. It fades up from the dark when it
       first shows, and down to the panel at the foot, where the name sits. */
    profileBanner(g, w, h, t, p) {
      if (p.banner && p.banner !== 'world' && BANNER[p.banner]) return BANNER[p.banner](g, w, h, t, p);   // another banner (THE LOOKS)
      const M = metalOf(p.league), seed = seedOf(p.user || p.display), r = seeded(seed);
      const accent = HUES[Math.floor(r() * HUES.length)];
      const age = life(g, t, p.user);
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#04060d'); sky.addColorStop(1, css(lerp([7, 10, 20], M.lo, 0.3)));
      g.fillStyle = sky; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 4; i++) {                 // nebulae, drifting
        const nx = r(), ny = r(), nr = 0.22 + r() * 0.3;
        glow(g, nx * w + (STILL ? 0 : Math.sin(t * 0.05 + i * 2) * w * 0.04), ny * h * 0.8, nr * Math.max(w, h * 3),
             i % 2 ? accent : M.mid, 0.11 + 0.035 * Math.sin(t * 0.4 + i));
      }
      const sr = seeded(seed + 7);
      for (let i = 0; i < 110; i++) {               // stars, the near ones drifting faster
        const sx = sr(), sy = sr(), z = 0.2 + sr() * 0.8, ph = sr() * TAU;
        const x = ((sx * w - t * 6 * z) % w + w) % w, y = sy * h * 0.8;
        g.fillStyle = 'rgba(226,232,240,' + (0.15 + 0.55 * z * (0.6 + 0.4 * Math.sin(t * 1.5 + ph))) + ')';
        const s = z > 0.85 ? 1.6 : 1;
        g.fillRect(x - s / 2, y - s / 2, s, s);
      }
      const hz = Math.round(h * 0.7);
      // the world, rising behind the horizon
      const R = h * (0.36 + r() * 0.22), px = w * (0.6 + r() * 0.24), py = hz - R * (0.25 + r() * 0.55);
      if (p.league === 'void') blackHole(g, px, py - R * 0.1, R * 0.58, t);
      else planet(g, px, py, R, M, t, seed, p.league === 'gold' || p.league === 'platinum');
      triangles(g, 0, 0, w, hz, t, { n: 22, lo: 10, hi: Math.min(70, h * 0.4), speed: 9, col: M.mid, alpha: 0.07, seed: seed % 64, line: 3 });
      // three of their pilot crossing the sky
      const P = pilotOf(p.pilot), lane = h * (0.16 + r() * 0.16), span = w + 260;
      const fx = STILL ? w * 0.3 : ((t * 22 + r() * span) % span) - 130;
      for (const [dx, dy, s] of [[0, 0, 15], [-26, -13, 11], [-26, 13, 11]]) {
        const x = fx + dx, y = lane + dy + (STILL ? 0 : Math.sin(t * 1.1 + dx) * 2);
        const trail = g.createLinearGradient(x - 70, 0, x - 8, 0);
        trail.addColorStop(0, css(P.M.mid, 0)); trail.addColorStop(1, css(P.M.mid, 0.4));
        g.strokeStyle = trail; g.lineWidth = s * 0.16;
        g.beginPath(); g.moveTo(x - 70, y); g.lineTo(x - 8, y); g.stroke();
        pilotShip(g, P, x, y, s, t, { rot: Math.PI / 2, glow: 6, phase: dx });
      }
      // the floor: the arena's grid running to the horizon, its lines coming on
      g.save();
      g.beginPath(); g.rect(0, hz, w, h - hz); g.clip();
      const floor = g.createLinearGradient(0, hz, 0, h);
      floor.addColorStop(0, css(lerp([6, 9, 18], M.lo, 0.25))); floor.addColorStop(1, '#060a14');
      g.fillStyle = floor; g.fillRect(0, hz, w, h - hz);
      const vx = w * 0.5, fh = h - hz;
      g.lineWidth = 1;
      for (let i = -24; i <= 24; i++) {
        const x1 = vx + i * Math.max(w, 600) * 0.08;
        const lg = g.createLinearGradient(0, hz, 0, h);
        lg.addColorStop(0, css(M.mid, 0)); lg.addColorStop(1, css(M.mid, 0.32));
        g.strokeStyle = lg;
        g.beginPath(); g.moveTo(vx + i * w * 0.012, hz); g.lineTo(x1, h); g.stroke();
      }
      const sp = STILL ? 0.5 : (t * 0.45) % 1;
      for (let j = 0; j < 14; j++) {
        const d = j + 1 - sp, y = hz + fh * 0.8 / d;
        if (y > h + 1) continue;
        g.strokeStyle = css(M.mid, 0.34 * clamp01((y - hz) / fh * 2.4));
        g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
      }
      g.restore();
      const line = g.createLinearGradient(0, 0, w, 0);
      line.addColorStop(0, css(M.hi, 0)); line.addColorStop(0.5, css(M.hi, 0.7)); line.addColorStop(1, css(M.hi, 0));
      g.fillStyle = line; g.fillRect(0, hz - 0.5, w, 1.2);
      glow(g, vx, hz, w * 0.35, M.mid, 0.08);
      // down to the panel at the foot, and up from the dark when it first shows
      const foot = g.createLinearGradient(0, h * 0.45, 0, h);
      foot.addColorStop(0, 'rgba(9,14,25,0)'); foot.addColorStop(1, 'rgba(9,14,25,0.92)');
      g.fillStyle = foot; g.fillRect(0, 0, w, h);
      glint(g, age + 0.6, 9, () => { g.beginPath(); g.rect(0, 0, w, h); }, 0, w, 0, h, 0.05);
      const dark = 1 - outQuint(age / 1.4);
      if (dark > 0) { g.fillStyle = 'rgba(5,6,10,' + dark + ')'; g.fillRect(0, 0, w, h); }
    },

    /* The player's emblem, a rounded square the way osu! cuts its avatars:
       a pattern of triangles grown from their name (mirrored, so it reads as
       a sign), in a pair of the game's colours picked by it, their initial
       lit in the middle, the pilot they last flew in the corner, and a rim
       in their league's metal. The triangles pop in from the middle out. */
    avatar(g, w, h, t, p) {
      if (p.picture && p.picture !== 'sigil' && PICTURE[p.picture]) return PICTURE[p.picture](g, w, h, t, p);   // another picture (THE LOOKS)
      const S = Math.min(w, h) - 2, x0 = (w - S) / 2, y0 = (h - S) / 2, cr = S * 0.2;
      const M = metalOf(p.league), r = seeded(seedOf(p.user || p.display));
      const i1 = Math.floor(r() * HUES.length), i2 = (i1 + 2 + Math.floor(r() * (HUES.length - 3))) % HUES.length;
      const c1 = HUES[i1], c2 = HUES[i2];
      const age = life(g, t, p.user || p.display);
      const k = outBack(age / 0.7);
      g.translate(w / 2, h / 2); g.scale(0.85 + 0.15 * k, 0.85 + 0.15 * k); g.translate(-w / 2, -h / 2);
      g.globalAlpha = clamp01(age / 0.25);
      const box = () => rrect(g, x0, y0, S, S, cr);
      g.save();
      box(); g.clip();
      const bg = g.createLinearGradient(x0, y0, x0 + S, y0 + S);
      bg.addColorStop(0, css(lerp(c1, [6, 8, 16], 0.5))); bg.addColorStop(1, css(lerp(c2, [6, 8, 16], 0.78)));
      g.fillStyle = bg; g.fillRect(x0, y0, S, S);
      const n = 5, cs = S / n;
      for (let row = 0; row < n; row++) {
        for (let col = 0; col < 3; col++) {
          const v = r(), kind = r();
          if (v < 0.4) continue;
          const pop = outBack((age - 0.15 - (2 - col + Math.abs(row - 2)) * 0.06) / 0.5);
          if (pop <= 0) continue;
          for (const cc of col === 2 ? [2] : [col, n - 1 - col]) {
            const cx = x0 + (cc + 0.5) * cs, cy = y0 + (row + 0.5) * cs, s = cs * 0.5 * pop, f = cc > 2 ? -1 : 1;
            g.beginPath();
            if (kind < 0.5) { g.moveTo(cx, cy - s); g.lineTo(cx + s, cy + s); g.lineTo(cx - s, cy + s); }
            else { g.moveTo(cx - s * f, cy - s); g.lineTo(cx + s * f, cy); g.lineTo(cx - s * f, cy + s); }
            g.closePath();
            g.fillStyle = css(v > 0.82 ? c2 : c1, 0.14 + (v - 0.4) * 0.5);
            g.fill();
          }
        }
      }
      triangles(g, x0, y0, S, S, t, { n: 8, lo: S * 0.06, hi: S * 0.2, speed: 6, col: [255, 255, 255], alpha: 0.06, seed: 50 });
      const vg = g.createRadialGradient(w / 2, h / 2, S * 0.1, w / 2, h / 2, S * 0.75);
      vg.addColorStop(0, 'rgba(4,6,12,0.55)'); vg.addColorStop(1, 'rgba(4,6,12,0)');
      g.fillStyle = vg; g.fillRect(x0, y0, S, S);
      // the initial
      g.font = '700 ' + Math.round(S * 0.5) + "px 'Chakra Petch', sans-serif";
      g.textAlign = 'center'; g.textBaseline = 'middle';
      const ink = g.createLinearGradient(0, y0 + S * 0.25, 0, y0 + S * 0.75);
      ink.addColorStop(0, '#ffffff'); ink.addColorStop(1, css(lerp(c1, [255, 255, 255], 0.3)));
      g.save();
      g.shadowColor = css(c1); g.shadowBlur = S * 0.12;
      g.fillStyle = ink;
      g.fillText(String(p.display || '?').slice(0, 1).toUpperCase(), w / 2, h / 2 + S * 0.03);
      g.restore();
      glint(g, age + 0.2, 6.5, box, x0, x0 + S, y0, y0 + S, 0.22);
      g.restore();
      // the pilot they last flew, in the corner
      if (p.pilot) {
        const cs2 = S * 0.32, cx = x0 + S - cs2 * 0.62, cy = y0 + S - cs2 * 0.62;
        const pk = outBack((age - 0.6) / 0.5);
        if (pk > 0) {
          g.save();
          g.translate(cx, cy); g.scale(pk, pk);
          rrect(g, -cs2 / 2, -cs2 / 2, cs2, cs2, cs2 * 0.3);
          g.fillStyle = 'rgba(5,7,14,0.88)'; g.fill();
          g.strokeStyle = css(pilotOf(p.pilot).M.mid, 0.7); g.lineWidth = 1.2; g.stroke();
          pilotShip(g, pilotOf(p.pilot), 0, cs2 * 0.04, cs2 * 0.62, t, { glow: 5 });
          g.restore();
        }
      }
      // the rim, in the league's metal
      rrect(g, x0 + 1.25, y0 + 1.25, S - 2.5, S - 2.5, cr - 1.25);
      const rim = g.createLinearGradient(x0, y0, x0 + S * 0.4, y0 + S);
      rim.addColorStop(0, css(M.hi)); rim.addColorStop(0.5, css(M.mid)); rim.addColorStop(1, css(M.lo));
      g.strokeStyle = rim; g.lineWidth = 2.5; g.stroke();
      if (!STILL && p.league && g.createConicGradient) {     // a light running round it, placed players only
        const run = g.createConicGradient(t * 0.8, w / 2, h / 2);
        run.addColorStop(0, css(M.hi, 0)); run.addColorStop(0.06, css(M.hi, 0.9)); run.addColorStop(0.12, css(M.hi, 0));
        run.addColorStop(1, css(M.hi, 0));
        g.strokeStyle = run; g.lineWidth = 2.5; g.stroke();
      }
    },

    /* Behind each placement tile: a wash of its metal (the place's on the
       game's boards, the league's on PvP), the board's sign big on the right
       (a dial for the season, a starred wreath for all-time, a sun for the
       daily, the league's own crest for PvP) drifting in as the tile lands,
       a bar down the left, and along the foot how much of the board is
       behind them, with TOP n% over it when the tile is wide enough. */
    statCard(g, w, h, t, s) {
      const placed = s.rank > 0, pvp = s.kind === 'pvp';
      const M = !placed ? COLD : pvp ? metalOf(s.league) : PLACE[s.rank] || METAL.cyan;
      const age = life(g, t, s);
      const wash = g.createLinearGradient(0, 0, w, h);
      wash.addColorStop(0, css(M.mid, placed ? 0.17 : 0.04)); wash.addColorStop(0.75, css(M.mid, 0));
      g.fillStyle = wash; g.fillRect(0, 0, w, h);
      triangles(g, w * 0.4, 0, w * 0.6, h, t, { n: 10, lo: 6, hi: 24, speed: 7, col: M.mid, alpha: placed ? 0.1 : 0.04,
                                                seed: { season: 5, all: 17, day: 29, pvp: 43 }[s.kind] || 0 });
      const r = h * 0.34, k = outQuint((age - 0.15) / 1.1);
      g.save();
      g.translate(w - r - 14 + (1 - k) * 34, h * 0.58);
      if (pvp && placed && LEAGUE[s.league]) {
        g.globalAlpha = 0.42 * k;
        g.scale(r / 30, r / 30);
        crestOf(g, s.league, t, age);
      } else if (MARK[s.kind]) {
        g.globalAlpha = (placed ? 0.3 : 0.1) * k;
        g.strokeStyle = css(M.hi); g.fillStyle = css(M.hi);
        g.lineWidth = 1.6; g.lineCap = 'round'; g.lineJoin = 'round';
        MARK[s.kind](g, r, t);
      }
      g.restore();
      if (!placed) return;
      const kb = outQuint((age - 0.2) / 0.6);
      g.save();
      g.shadowColor = css(M.mid); g.shadowBlur = 8;
      rrect(g, 6, h / 2 - (h / 2 - 12) * kb, 3, (h - 24) * kb, 1.5);
      g.fillStyle = css(M.mid); g.fill();
      g.restore();
      const share = s.of > 1 ? 1 - (s.rank - 1) / (s.of - 1) : 1;
      const bw = w - 28, fill = Math.max(3, bw * share * outQuint((age - 0.3) / 1.3));
      rrect(g, 14, h - 7, bw, 3, 1.5);
      g.fillStyle = 'rgba(255,255,255,0.07)'; g.fill();
      rrect(g, 14, h - 7, fill, 3, 1.5);
      const bar = g.createLinearGradient(14, 0, 14 + bw, 0);
      bar.addColorStop(0, css(M.lo)); bar.addColorStop(1, css(M.hi));
      g.fillStyle = bar; g.fill();
      if (w >= 200) {
        const pct = s.rank / Math.max(1, s.of) * 100;
        g.font = "700 10px 'Chakra Petch', sans-serif";
        if ('letterSpacing' in g) g.letterSpacing = '1.5px';
        g.textAlign = 'right'; g.textBaseline = 'middle';
        g.fillStyle = css(M.hi, 0.9 * clamp01((age - 0.5) / 0.4));
        g.fillText(s.rank === 1 ? 'TOP SPOT' : 'TOP ' + (pct < 1 ? '<1' : Math.ceil(pct)) + '%', w - 13, 17);
      }
    },

    /* A pilot in the hangar, or beside a match: a beveled hexagon in the
       pilot's colour with its ship in it, the game's own hull. Locked, the
       hexagon is cold slate with the ship a shadow and a padlock on it.
       Awakened, the form shows round it: EMBER's IFRIT in flames, THE
       HACKER's SUPERUSER in a gold ring of bits, THE VAGRANT's RONIN in red
       crescents and a cut across now and then, and its eye lit. The four
       pop in one after another. Drawn on a 64 grid: under 44 px across it
       keeps to the hexagon, the ship and a ring. */
    pilotBadge(g, w, h, t, b) {
      const P = pilotOf(b.id), S = Math.min(w, h), small = S < 44;
      const order = Math.max(0, Object.keys(PILOT).indexOf(b.id));
      const age = life(g, t, b.id) - (small ? 0.3 : 0.25 + order * 0.09);
      if (age <= 0) return;
      const k = outBack(age / 0.6);
      g.translate(w / 2, h / 2);
      g.scale(S / 64 * k, S / 64 * k);
      g.globalAlpha = clamp01(age / 0.2);
      const owned = !!b.owned, awake = owned && !!b.awake, M = owned ? P.M : COLD;
      const R = awake ? 23 : 26, ri = R - 4.8, cr = 3.6;
      if (awake) aura(g, P, t, R, small);
      else if (owned) glow(g, 0, 0, 34, P.M.mid, 0.14 + (STILL ? 0 : 0.04 * Math.sin(t * 1.6 + order)));
      const out = ngon(0, 0, R, 6, -Math.PI / 2), inn = ngon(0, 0, ri, 6, -Math.PI / 2);
      bevel(g, out, inn, cr, M.mid, (i, kk) => lit(M, owned ? kk : kk * 0.7));
      face(g, inn, cr * 0.6, M);
      if (owned && !small) {
        g.save();
        roundPath(g, inn, cr * 0.6); g.clip();
        triangles(g, -ri, -ri, ri * 2, ri * 2, t, { n: 7, lo: 3, hi: 9, speed: 5, col: P.M.mid, alpha: 0.22, seed: 11 + order * 9 });
        g.restore();
      }
      pilotShip(g, P, 0, 1.5, ri * 1.42, t, { dark: !owned, awake, glow: 7, phase: order });
      if (!owned && !small) padlock(g, ri * 0.52, ri * 0.5, 9);
      if (owned) glint(g, age + order * 0.8, 5.5, () => roundPath(g, out, cr), -R, R, -R, R, 0.4);
    },

    /* One season podium, a medal on a ribbon: the ribbon in the game's cyan
       and pink, the medal in the place's metal with a milled edge, a wreath
       round the number and a glint across it. It drops in, swings, and
       settles to a slow sway. Drawn on a 64 grid, hung from the top. */
    award(g, w, h, t, a) {
      const M = PLACE[a.rank] || METAL.cyan, S = Math.min(w, h);
      const age = life(g, t, a.season + ':' + a.rank) - 0.25;
      if (age <= 0) return;
      const drop = outQuint(age / 0.7);
      const swing = STILL ? 0 : Math.sin(age * 5.5) * Math.exp(-age * 2.4) * 0.35 + Math.sin(t * 1.2 + a.rank) * 0.03;
      g.translate(w / 2, (h - S) / 2);
      g.scale(S / 64, S / 64);
      g.globalAlpha = clamp01(age / 0.2);
      g.translate(0, -18 * (1 - drop));
      g.rotate(swing);
      // the ribbon: two straps meeting behind the medal
      for (const [sd, c] of [[-1, '#67e8f9'], [1, '#f472b6']]) {
        g.beginPath();
        g.moveTo(sd * 15, 0); g.lineTo(sd * 5, 0); g.lineTo(-sd * 3, 30); g.lineTo(sd * 6, 30);
        g.closePath();
        const gr = g.createLinearGradient(sd * 15, 0, 0, 30);
        gr.addColorStop(0, c); gr.addColorStop(1, css(lerp(rgb(c), [5, 8, 16], 0.55)));
        g.fillStyle = gr; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = 0.8;
        g.beginPath(); g.moveTo(sd * 12.5, 0); g.lineTo(sd * 4.2, 28); g.stroke();
      }
      const cy = 42, R = 18.5;
      g.save();
      g.shadowColor = css(M.mid, 0.6); g.shadowBlur = 8;
      // the milled edge
      g.beginPath();
      for (let i = 0; i < 48; i++) {
        const an = i / 48 * TAU, rr = i % 2 ? R : R - 1.3;
        i ? g.lineTo(Math.cos(an) * rr, cy + Math.sin(an) * rr) : g.moveTo(Math.cos(an) * rr, cy + Math.sin(an) * rr);
      }
      g.closePath();
      const body = g.createLinearGradient(-R, cy - R, R * 0.4, cy + R);
      body.addColorStop(0, css(M.hi)); body.addColorStop(0.5, css(M.mid)); body.addColorStop(1, css(M.lo));
      g.fillStyle = body; g.fill();
      g.restore();
      // the face, sunk a step
      const disc = () => { g.beginPath(); g.arc(0, cy, R - 4, 0, TAU); };
      disc();
      const f = g.createRadialGradient(-4, cy - 6, 1, 0, cy, R - 4);
      f.addColorStop(0, css(lit(M, 0.85))); f.addColorStop(1, css(lit(M, 0.3)));
      g.fillStyle = f; g.fill();
      g.strokeStyle = css(M.lo, 0.8); g.lineWidth = 1; g.stroke();
      // the wreath
      g.fillStyle = css(lerp(M.lo, [8, 10, 18], 0.3), 0.55);
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 5; i++) {
          const an = Math.PI / 2 + sd * (0.5 + i * 0.36), x = Math.cos(an) * (R - 7.5), y = cy + Math.sin(an) * (R - 7.5);
          g.save(); g.translate(x, y); g.rotate(an + sd * 1.2);
          g.beginPath(); g.ellipse(0, 0, 1.1, 2.6, 0, 0, TAU); g.fill();
          g.restore();
        }
      }
      g.font = "700 15px 'Chakra Petch', 'JetBrains Mono', sans-serif";
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.fillText(String(a.rank), 0, cy + 1.6);
      g.fillStyle = css(lerp(M.lo, [8, 10, 18], 0.55));
      g.fillText(String(a.rank), 0, cy + 0.8);
      glint(g, age + a.rank * 0.7, 4.8, () => { g.beginPath(); g.arc(0, cy, R, 0, TAU); }, -R, R, cy - R, cy + R, 0.6);
    },

    /* A decal (src/looks.js), one of the small badges in the row under the
       name: a beveled hexagon in its metal, its mark sunk in the face. Each
       pops in a beat after the one before it (d.i), and a glint crosses it
       now and then. On a 40 grid. */
    decal(g, w, h, t, d) {
      const D = DECAL[d.id] || { M: METAL.cyan, glyph: 'star' }, M = D.M, S = Math.min(w, h), i = d.i || 0;
      const age = life(g, t, d.id) - 0.35 - i * 0.08;
      if (age <= 0) return;
      const k = outBack(age / 0.55);
      g.translate(w / 2, h / 2); g.scale(S / 40 * k, S / 40 * k);
      g.globalAlpha = clamp01(age / 0.2);
      glow(g, 0, 0, 22, M.mid, 0.18 + (STILL ? 0 : 0.05 * Math.sin(t * 1.7 + i)));
      const out = ngon(0, 0, 17, 6, -Math.PI / 2), inn = ngon(0, 0, 13, 6, -Math.PI / 2);
      bevel(g, out, inn, 2.6, M.mid, (j, kk) => lit(M, kk));
      face(g, inn, 1.6, M);
      g.save();
      g.shadowColor = css(M.mid, 0.8); g.shadowBlur = 5;
      const ink = g.createLinearGradient(0, -9, 0, 9);
      ink.addColorStop(0, css(M.hi)); ink.addColorStop(1, css(lit(M, 0.55)));
      g.fillStyle = ink; g.strokeStyle = ink;
      (GLYPH[D.glyph] || GLYPH.star)(g, t, M);
      g.restore();
      glint(g, age + i * 0.6, 5, () => roundPath(g, out, 2.6), -17, 17, -17, 17, 0.45);
    },

    /* Behind each recent match, after osu!'s score rows: a plate on the left
       in the result's colour (green a win, red a loss, slate no contest;
       striped when it was a forfeit, triangles rising in a win), its edge
       slanted, and on the right a darker slanted panel for the score, a
       stripe on top in the queue's colour (ranked cyan, casual violet, a
       friend's pink). The plate is the row's first 72 px and the panel its
       last 84 (leaderboard.css lays the row on the same); both slide in. */
    matchRow(g, w, h, t, m) {
      const col = m.won === true ? rgb('#4ade80') : m.won === false ? rgb('#f87171') : rgb('#64748b');
      const q = rgb({ ranked: '#67e8f9', casual: '#a78bfa', friend: '#f472b6' }[m.queue] || '#67e8f9');
      const PL = 72, PN = 84, sk = h * 0.3;
      const age = life(g, t, m), k = outQuint((age - 0.45) / 0.8);
      const wash = g.createLinearGradient(0, 0, w * 0.6, 0);
      wash.addColorStop(0, css(col, 0.12)); wash.addColorStop(1, css(col, 0));
      g.fillStyle = wash; g.fillRect(0, 0, w, h);
      // the plate
      const pw = (PL + sk / 2) * k;
      const plate = () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(pw, 0); g.lineTo(pw - sk, h); g.lineTo(0, h); g.closePath(); };
      plate();
      const pg = g.createLinearGradient(0, 0, 0, h);
      pg.addColorStop(0, css(lerp(col, [255, 255, 255], 0.2), 0.95)); pg.addColorStop(1, css(lerp(col, [5, 8, 16], 0.3), 0.95));
      g.fillStyle = pg; g.fill();
      g.save();
      plate(); g.clip();
      if (m.won === true) triangles(g, 0, 0, PL, h, t, { n: 6, lo: 5, hi: 16, speed: 8, col: [255, 255, 255], alpha: 0.28, seed: 33 });
      if (m.verdict === 'forfeit' || m.verdict === 'void') {
        g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = 4;
        g.beginPath();
        for (let x = -h; x < PL + h; x += 10) { g.moveTo(x, h); g.lineTo(x + h, 0); }
        g.stroke();
      }
      g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(0, 0, pw, 1);
      g.restore();
      // the score's panel
      const x0 = w - (PN + sk / 2) * k;
      const panel = () => { g.beginPath(); g.moveTo(x0 + sk, 0); g.lineTo(w, 0); g.lineTo(w, h); g.lineTo(x0, h); g.closePath(); };
      panel();
      g.fillStyle = 'rgba(2,5,12,0.55)'; g.fill();
      g.save();
      panel(); g.clip();
      const qg = g.createLinearGradient(x0, 0, w, 0);
      qg.addColorStop(0, css(q, 0.9)); qg.addColorStop(1, css(q, 0.3));
      g.fillStyle = qg; g.fillRect(x0, 0, w - x0, 2);
      glint(g, age + 1, 7, panel, x0, w, 0, h, 0.08);
      g.restore();
      g.strokeStyle = css(q, 0.45); g.lineWidth = 1;
      g.beginPath(); g.moveTo(x0 + sk, 0); g.lineTo(x0, h); g.stroke();
    }
  };
})();
