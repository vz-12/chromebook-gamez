/* ===========================================================================
   VOIDRUNNER PvP — ART HOOKS (redraw these: nothing else needs to change)

   PVP_ART.belt(g, w, h, t, d)
     The map draw at the start of a match: a belt that spins through the
     sectors, lands on the one drawn, then shows whether it is CLEAN or
     INFESTED. Called every frame while it runs, onto the game's own canvas.

       g     the canvas's 2D context, in CSS pixels; saved and restored around
             the call, so leave it however you like
       w, h  the canvas's size, in CSS pixels
       t     seconds since the belt started (it runs d.dur seconds, then the
             match moves on by itself, whatever is drawn)
       d     what was drawn:
               maps       every sector a duel can be on, in order:
                          [{ name, tag, accent, bg, grid, wall }]  (colours as '#rrggbb')
               pick       the index into maps of the one drawn
               infested   true: infested (enemies keep arriving); false: clean
               odds       the chance it was going to be infested: 0.5, 0.75 or 1
               hackers    how many of the two pilots are THE HACKER (0, 1, 2),
                          which is what tipped the odds
               dur        the belt's length in seconds (4.8)
             and who is fighting, from this player's side (the same fields
             PVP_ART.result gets):
               me, them   { name, pilot, pilotName, col, awake, bonus }
               bestOf     3 or 5
               queue      'ranked' | 'casual' | 'friend'
               league     { id, n } in ranked, else null
               rated      whether a rating moves
               hull(id)   that pilot's real hull as a path on g (see below)

   PVP_ART.result(g, w, h, t, r)
     The end of a match, from this player's side: called every frame from
     the moment it ends until they leave, onto the game's own canvas, the
     same way as the belt. t is seconds since it appeared. The room's one
     button (BACK TO THE LOBBY) sits centred along the bottom: leave about
     90 px there. r:

       outcome   'won' | 'lost' | 'left' (the other player went before the
                 end: a win by forfeit, once the referee says so) | 'void'
                 (the referee found the two games disagreed: no contest).
                 It can turn to 'void' a moment after it first shows.
       score     [mine, theirs] rounds          bestOf  3 or 5
       time      the match's fighting time, in seconds
       me, them  { name, pilot: 'runner' | 'ember' | 'hacker' | 'melee',
                   pilotName, col (the pilot's colour, '#rrggbb'), awake,
                   bonus (upgrades a watched ad added to their start: 0,
                   or 2 in a friend match; the lobby's ads.js) }
       rounds    each round in order: { won (mine?), at (match clock, s),
                 left (the winner's health when it ended, 0 to 1) }
       dealt     [mine, theirs]: health each took off the other
       map       { name, tag, accent, bg, grid, wall }, as on the belt
       infested  true or false
       queue     'ranked' | 'casual' | 'friend'
       league    { id, n } in ranked ('bronze' … 'void'), else null
       rated     whether a rating moves
       verdict   null until the referee answers (a second or so, longer if
                 the other side went quiet), then { v: 'played' | 'forfeit'
                 | 'void', won (true | false | null) }
       rating    ranked, once written: { before, after, games, league (an
                 id, or null while still being placed), left (placement
                 matches to go) }, else null
       hull(id)  builds that pilot's real hull as a path on g, nose to the
                 right, about 36 px long: translate, rotate and scale first,
                 then fill or stroke

   Both hooks can be seen without playing: /play/?preview=belt and
   /play/?preview=result (with buttons for each outcome; preview.js).

   The background is already painted (the game's own dark). A throw is
   logged once and leaves the screen blank; the match carries on regardless.

   THE LOOK, after osu!lazer (and the leaderboard's art.js, which is drawn
   the same way): flat rounded panels on soft shadows, circles and arcs,
   osu!'s triangles drifting up behind everything, and every move a quick
   OutQuint that settles slowly. Each screen is laid out on a fixed design
   frame (FRAME below) and scaled to fit, so it reads the same on any
   window; backgrounds run full bleed.

     belt     the two pilots' cards either side, a VS badge over the middle;
              between them the sectors as a carousel (osu!'s song select
              when you press random) that spins and lands; then a ring split
              CLEAN / INFESTED by the odds (THE HACKER tips it, and says so),
              a marker spins round it and stops on the side that was drawn.
     result   the outcome as a title, the pilots' cards either side of a ring
              with a slot per round (green mine, rose theirs) and the score
              inside, then the numbers, a tile per round, and the referee's
              word (in ranked the rating, rolling from before to after).
   ========================================================================= */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* -------------------------------- colour -------------------------------- */
  const rgb = hex => { const n = parseInt(String(hex).slice(1, 7), 16) || 0; return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const css = (c, a = 1) => 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')';
  const rgba = (hex, a) => css(rgb(hex), a);
  const mixc = (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];
  const mix = (h1, h2, k, a = 1) => css(mixc(rgb(h1), rgb(h2), k), a);

  const PANEL = '#0f1626';             // the cards' panels
  const INK = '#f1f5f9', TEXT = '#cbd5e1', DIM = '#7c8aa0', FAINT = '#475569';
  const PINK = '#f472b6';
  const WIN = '#86efac', LOSS = '#fb7185';
  const CLEAN = '#67e8f9', INFEST = '#f87171', HACKER = '#a3e635';
  // the leagues' metals, as on the leaderboard: highlight, body, shadow
  const METAL = {
    bronze:   ['#ffd6b0', '#e08a46', '#76360d'],
    silver:   ['#ffffff', '#cbd5e1', '#56637a'],
    gold:     ['#fff5c4', '#fbbf24', '#9a5b07'],
    platinum: ['#effffe', '#67e8f9', '#0b6278'],
    void:     ['#f5d0fe', '#c084fc', '#3b0f7a']
  };
  // each outcome's title: its gradient, top to bottom
  const OUT = {
    won:  { word: 'VICTORY',       a: '#fff4c2', b: '#fbbf24' },
    lost: { word: 'DEFEAT',        a: '#ffe0e6', b: '#fb7185' },
    left: { word: 'OPPONENT LEFT', a: '#dcfbff', b: '#67e8f9' },
    void: { word: 'NO CONTEST',    a: '#eef2f7', b: '#94a3b8' }
  };

  /* ------------------------------ easing, time ----------------------------- */
  const clamp01 = x => (x < 0 ? 0 : x > 1 ? 1 : x);
  const outQuint = x => 1 - Math.pow(1 - clamp01(x), 5);
  const outCubic = x => 1 - Math.pow(1 - clamp01(x), 3);
  const outBack = x => { x = clamp01(x); const c = 1.4, d = x - 1; return 1 + (c + 1) * d * d * d + c * d * d; };
  // a number in 0..1 from an integer, the same every time
  const hash = n => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  /* -------------------------------- shapes -------------------------------- */
  // a closed path through pts, each corner rounded by r
  const roundPath = (g, pts, r) => {
    const n = pts.length;
    g.beginPath();
    g.moveTo((pts[n - 1][0] + pts[0][0]) / 2, (pts[n - 1][1] + pts[0][1]) / 2);
    for (let i = 0; i < n; i++) {
      const p = pts[i], q = pts[(i + 1) % n];
      g.arcTo(p[0], p[1], (p[0] + q[0]) / 2, (p[1] + q[1]) / 2, r);
    }
    g.closePath();
  };
  // a rounded rectangle added to the path under way (several, then one fill)
  const rrectTo = (g, x, y, w, h, r) => {
    r = Math.max(0, Math.min(r, w / 2, h / 2));
    g.moveTo(x + r, y);
    g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r);
    g.closePath();
  };
  const rrect = (g, x, y, w, h, r) => { g.beginPath(); rrectTo(g, x, y, w, h, r); };
  const ngon = (x, y, r, sides, rot) => {
    const pts = [];
    for (let i = 0; i < sides; i++) { const a = rot + i * TAU / sides; pts.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    return pts;
  };
  // a rounded triangle pointing along angle a
  const tri = (g, x, y, s, a, r) => roundPath(g, ngon(x, y, s, 3, a), r === undefined ? s * 0.22 : r);
  const arc = (g, x, y, r, a0, a1) => { g.beginPath(); g.arc(x, y, r, a0, a1); };
  const circle = (g, x, y, r) => { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); };

  // a soft round light
  const glow = (g, x, y, r, col, a) => {
    if (a <= 0 || r <= 0) return;
    const c = rgb(col), gr = g.createRadialGradient(x, y, 0, x, y, r);
    gr.addColorStop(0, css(c, a)); gr.addColorStop(1, css(c, 0));
    g.fillStyle = gr;
    g.fillRect(x - r, y - r, r * 2, r * 2);
  };

  // a panel's soft shadow: two dark layers, cheaper than a blur
  const shadow = (g, x, y, w, h, r) => {
    rrect(g, x - 3, y + 2, w + 6, h + 8, r + 3); g.fillStyle = 'rgba(0,0,0,0.16)'; g.fill();
    rrect(g, x, y + 5, w, h, r); g.fillStyle = 'rgba(0,0,0,0.3)'; g.fill();
  };

  /* osu!'s triangles: a fixed set, rising forever through the box (x, y, w, h).
     o = { n, lo, hi (sizes), speed (px/s), col ([r,g,b]), alpha, seed,
     line (outline every nth one instead of filling it) } */
  const TRIS = (() => {
    let s = 4242;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647), out = [];
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

  /* --------------------------------- text --------------------------------- */
  const FONT = (wt, px) => wt + ' ' + px + "px Barlow, 'Segoe UI', system-ui, sans-serif";
  const spacing = (g, sp) => { if ('letterSpacing' in g) g.letterSpacing = sp + 'px'; };
  // one line, middle-aligned on y; sp = letter spacing in px
  function text(g, s, x, y, font, fill, align = 'center', sp = 0) {
    g.font = font; g.textAlign = align; g.textBaseline = 'middle';
    spacing(g, sp);
    g.fillStyle = fill;
    // letter spacing trails the last letter too: centre on the letters
    g.fillText(s, x + (align === 'center' ? sp / 2 : align === 'right' ? sp : 0), y);
    spacing(g, 0);
  }
  function textW(g, s, font, sp = 0) {
    g.font = font; spacing(g, sp);
    const w = g.measureText(s).width - sp;
    spacing(g, 0);
    return w;
  }
  // the biggest size up to px at which s fits in max
  function fitPx(g, s, wt, px, max, sp = 0, min = 10) {
    while (px > min && textW(g, s, FONT(wt, px), sp) > max) px--;
    return px;
  }
  // a number in fixed-width digits, so a rolling counter doesn't shiver
  function num(g, s, x, y, font, fill, align = 'center') {
    g.font = font; g.textBaseline = 'middle'; g.textAlign = 'center'; g.fillStyle = fill; spacing(g, 0);
    const d0 = g.measureText('0').width, chars = [...String(s)];
    const ws = chars.map(ch => (ch >= '0' && ch <= '9' ? d0 : g.measureText(ch).width));
    const total = ws.reduce((a, b) => a + b, 0);
    let px = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
    chars.forEach((ch, i) => { g.fillText(ch, px + ws[i] / 2, y); px += ws[i]; });
    return total;
  }
  const clock = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  const thousands = n => Math.round(n).toLocaleString('en-US');

  /* A rounded pill with a label, its left end at x, centred on y. o = { h,
     px, fill, ink, line, icon (draws in a square of side h - 8 at its left),
     measure (only say how wide) }. Returns its width. */
  function chip(g, x, y, label, col, o = {}) {
    const h = o.h || 26, px = o.px || 11, sp = 1.8, font = FONT(800, px), pad = h * 0.5;
    const ic = o.icon ? h - 8 : 0, gap = o.icon ? 7 : 0;
    const tw = textW(g, label, font, sp), w = pad * 2 + ic + gap + tw;
    if (o.measure) return w;
    rrect(g, x, y - h / 2, w, h, h / 2);
    g.fillStyle = o.fill || rgba(col, 0.16); g.fill();
    if (o.line) { g.strokeStyle = rgba(col, 0.45); g.lineWidth = 1; g.stroke(); }
    if (o.icon) o.icon(x + pad + ic / 2 - 2, y, ic / 2);
    text(g, label, x + pad + ic + gap, y + 0.5, font, o.ink || col, 'left', sp);
    return w;
  }
  // chips in a row, centred on cx
  function chipRow(g, cx, y, list, gap = 8) {
    const ws = list.map(c => chip(g, 0, 0, c.label, c.col, Object.assign({}, c.o, { measure: true })));
    let x = cx - (ws.reduce((a, b) => a + b, 0) + gap * (ws.length - 1)) / 2;
    list.forEach((c, i) => { chip(g, x, y, c.label, c.col, c.o || {}); x += ws[i] + gap; });
  }

  // a league's gem: a rounded hexagon in its metal, lit from the top left
  function gem(g, x, y, r, id) {
    const M = METAL[id] || METAL.silver;
    roundPath(g, ngon(x, y, r, 6, -Math.PI / 2), r * 0.24);
    const b = g.createLinearGradient(x - r, y - r, x + r * 0.6, y + r);
    b.addColorStop(0, M[0]); b.addColorStop(0.5, M[1]); b.addColorStop(1, M[2]);
    g.fillStyle = b; g.fill();
    roundPath(g, ngon(x, y - r * 0.06, r * 0.5, 6, -Math.PI / 2), r * 0.12);
    g.fillStyle = id === 'void' ? 'rgba(14,4,30,0.85)' : 'rgba(255,255,255,0.32)'; g.fill();
  }
  const gemIcon = id => (g => (x, y, r) => gem(g, x, y, r * 1.05, id));

  /* -------------------------------- pilots -------------------------------- */
  // where each hull's middle is, along its length (hullPath's own points)
  const MID = { runner: 3.8, ember: 5, hacker: 4.5, melee: -1.2 };

  // a pilot's hull, flat in its colour, centred on (x, y), dir 1 nose right
  function hull(g, d, id, x, y, len, dir, col, a = 1) {
    if (typeof d.hull !== 'function') return;
    const k = len / 34;
    g.save();
    g.translate(x, y); g.scale(dir * k, k); g.translate(-(MID[id] || 4), 0);
    d.hull(id);
    const f = g.createLinearGradient(0, -14, 0, 14);
    f.addColorStop(0, mix(col, '#ffffff', 0.45, a)); f.addColorStop(0.55, rgba(col, a)); f.addColorStop(1, mix(col, '#000000', 0.25, a));
    g.fillStyle = f; g.fill();
    g.restore();
  }

  /* The pilot's avatar: a disc tinted with its colour, a ring, the hull
     facing the other one, and while awake a ring of light chasing round. */
  function avatar(g, d, p, x, y, R, t, dir, dim) {
    const col = dim ? mix(p.col, '#64748b', 0.75) : p.col;
    circle(g, x, y, R + 6); g.fillStyle = PANEL; g.fill();
    const bg = g.createLinearGradient(x - R, y - R, x + R, y + R);
    bg.addColorStop(0, mix(col, '#0b1020', 0.55)); bg.addColorStop(1, mix(col, '#0b1020', 0.88));
    circle(g, x, y, R); g.fillStyle = bg; g.fill();
    g.save();
    circle(g, x, y, R - 1); g.clip();
    triangles(g, x - R, y - R, R * 2, R * 2, t, { n: 8, lo: R * 0.2, hi: R * 0.7, speed: 6, col: rgb(col), alpha: 0.16, seed: 11 });
    glow(g, x, y, R * 0.95, col, 0.35);
    g.restore();
    hull(g, d, p.pilot, x, y, R * 1.32, dir, col);
    circle(g, x, y, R); g.strokeStyle = col; g.lineWidth = Math.max(2, R * 0.075); g.stroke();
    if (p.awake && !dim) {
      const rr = R + 10;
      if (g.createConicGradient) {
        for (const [ph, a] of [[0, 0.95], [Math.PI, 0.45]]) {
          const cg = g.createConicGradient(t * 2.2 + ph, x, y);
          cg.addColorStop(0, rgba(p.col, 0)); cg.addColorStop(0.42, rgba(p.col, a)); cg.addColorStop(0.5, rgba(p.col, 0)); cg.addColorStop(1, rgba(p.col, 0));
          circle(g, x, y, rr); g.strokeStyle = cg; g.lineWidth = 3; g.stroke();
        }
      } else {
        arc(g, x, y, rr, t * 2.2, t * 2.2 + 1.4); g.strokeStyle = p.col; g.lineWidth = 3; g.lineCap = 'round'; g.stroke();
      }
      glow(g, x, y, R * 1.6, p.col, 0.12 + 0.05 * Math.sin(t * 2.4));
    }
  }

  /* A pilot's card, after lazer's user panels: a cover in the pilot's colour
     with triangles rising through it, the avatar half over its edge, the name,
     the pilot, AWAKENED if so. o = { dir, cover, R, tag, tagCol, badge,
     badgeCol, ring (an outline colour), dim, seed } */
  function pilotCard(g, d, p, x, y, cw, ch, t, o) {
    const r = 18, cover = o.cover, R = o.R, col = o.dim ? mix(p.col, '#64748b', 0.75) : p.col;
    if (o.ring) {
      rrect(g, x - 6, y - 6, cw + 12, ch + 12, r + 6); g.fillStyle = rgba(o.ring, 0.08); g.fill();
    }
    shadow(g, x, y, cw, ch, r);
    rrect(g, x, y, cw, ch, r); g.fillStyle = PANEL; g.fill();
    g.save();
    rrect(g, x, y, cw, ch, r); g.clip();
    const cg = g.createLinearGradient(x, y, x + cw, y + cover);
    cg.addColorStop(0, rgba(col, 0.62)); cg.addColorStop(1, rgba(col, 0.2));
    g.fillStyle = cg; g.fillRect(x, y, cw, cover);
    triangles(g, x, y, cw, cover, t, { n: 14, lo: 10, hi: cover * 0.55, speed: 9, col: mixc(rgb(col), [255, 255, 255], 0.35), alpha: 0.2, seed: o.seed || 0, line: 3 });
    const fade = g.createLinearGradient(0, y + cover * 0.35, 0, y + cover);
    fade.addColorStop(0, rgba(PANEL, 0)); fade.addColorStop(1, rgba(PANEL, 1));
    g.fillStyle = fade; g.fillRect(x, y, cw, cover + 1);
    g.restore();
    rrect(g, x + 0.5, y + 0.5, cw - 1, ch - 1, r);
    g.strokeStyle = o.ring ? rgba(o.ring, 0.85) : 'rgba(255,255,255,0.07)'; g.lineWidth = o.ring ? 2 : 1; g.stroke();

    avatar(g, d, p, x + cw / 2, y + cover, R, t, o.dir, o.dim);

    let ty = y + cover + R + 26;
    const name = String(p.name || '');
    text(g, name, x + cw / 2, ty, FONT(800, fitPx(g, name, 800, 22, cw - 28)), o.dim ? DIM : INK);
    ty += 24;
    text(g, String(p.pilotName || '').toUpperCase(), x + cw / 2, ty, FONT(700, 12), col, 'center', 2.4);
    if (p.awake) {
      ty += 28;
      const w = chip(g, 0, 0, 'AWAKENED', col, { measure: true, h: 22, px: 10 });
      chip(g, x + cw / 2 - w / 2, ty, 'AWAKENED', col, { h: 22, px: 10, fill: rgba(col, 0.14), line: true });
    }
    if (o.tag) chip(g, x + 12, y + 24, o.tag, o.tagCol, { h: 22, px: 10, fill: rgba(o.tagCol, 0.9), ink: '#0b1020' });
    if (o.badge) {
      const w = chip(g, 0, 0, o.badge, o.badgeCol, { measure: true, h: 22, px: 10 });
      chip(g, x + cw - 12 - w, y + 24, o.badge, o.badgeCol, { h: 22, px: 10, fill: rgba(o.badgeCol, o.badgeFill || 0.9), ink: o.badgeInk || '#0b1020' });
    }
  }

  /* ------------------------------- sectors -------------------------------- */
  /* Each sector's cover: a pattern of plain shapes in its own colours, after
     what the room is (the grid's tiles, the foundry's gear and vents, the
     hive's cells, the vault's lasers, the void's well, the archive's records,
     the mirror's line). Drawn into the box; the caller clips. */
  const COVERS = {
    'THE GRID'(g, s, x, y, w, h, t) {
      const c = 15, step = 21, y0 = y + (h - Math.floor(h / step) * step + 6) / 2, SH = 5;
      const shade = Array.from({ length: SH }, () => []);   // the tiles in five shades, one fill each
      for (let gx = x + 4; gx < x + w; gx += step) for (let gy = y0; gy < y + h; gy += step) {
        const k = 0.5 + 0.5 * Math.sin(t * 1.7 + gx * 0.05 - gy * 0.09);
        shade[Math.min(SH - 1, Math.floor(k * k * k * SH))].push(gx, gy);
      }
      shade.forEach((list, i) => {
        if (!list.length) return;
        g.beginPath();
        for (let j = 0; j < list.length; j += 2) rrectTo(g, list[j], list[j + 1], c, c, 4);
        g.fillStyle = rgba(s.accent, 0.06 + 0.3 * (i + 0.5) / SH); g.fill();
      });
    },
    'THE FOUNDRY'(g, s, x, y, w, h, t) {
      g.lineCap = 'round'; g.lineWidth = 7;
      g.strokeStyle = rgba(s.accent, 0.12);
      g.beginPath();
      for (let i = -2; i < w / 30 + 2; i++) {
        const sx = x + i * 30 + (t * 16) % 30;
        g.moveTo(sx - 20, y + h + 8); g.lineTo(sx + 20, y - 8);
      }
      g.stroke();
      const ox = x + w * 0.68, oy = y + h / 2, R = h * 0.34;
      glow(g, ox, oy, R * 2.4, s.accent, 0.3);
      g.save(); g.translate(ox, oy); g.rotate(t * 0.6);
      g.fillStyle = rgba(s.accent, 0.6);
      for (let i = 0; i < 10; i++) { g.rotate(TAU / 10); rrect(g, R * 0.8, -R * 0.17, R * 0.5, R * 0.34, R * 0.1); g.fill(); }
      g.restore();
      circle(g, ox, oy, R); g.strokeStyle = rgba(s.accent, 0.8); g.lineWidth = R * 0.26; g.stroke();
      circle(g, ox, oy, R * 0.3); g.fillStyle = rgba(s.accent, 0.5); g.fill();
    },
    'THE HIVE'(g, s, x, y, w, h, t) {
      const r = 11, dx = r * Math.sqrt(3), dy = r * 1.5, hr = r - 1.6, SH = 3;
      const hex = (hx, hy) => {
        g.moveTo(hx, hy - hr);
        for (let i = 1; i < 6; i++) g.lineTo(hx + Math.sin(i * Math.PI / 3) * hr, hy - Math.cos(i * Math.PI / 3) * hr);
        g.closePath();
      };
      const lit = Array.from({ length: SH }, () => []);
      g.beginPath();
      let row = 0;
      for (let hy = y; hy < y + h + r; hy += dy, row++) for (let hx = x - dx + (row % 2) * dx / 2; hx < x + w + dx; hx += dx) {
        hex(hx, hy);
        const k = 0.5 + 0.5 * Math.sin(t * 1.4 + hx * 0.045 + hy * 0.12);
        if (k > 0.78) lit[Math.min(SH - 1, Math.floor((k - 0.78) / 0.22 * SH))].push(hx, hy);
      }
      g.lineJoin = 'round'; g.lineWidth = 1.3; g.strokeStyle = rgba(s.accent, 0.2); g.stroke();
      lit.forEach((list, i) => {
        if (!list.length) return;
        g.beginPath();
        for (let j = 0; j < list.length; j += 2) hex(list[j], list[j + 1]);
        g.fillStyle = rgba(s.accent, 0.2 + 0.4 * (i + 0.5) / SH); g.fill();
      });
    },
    'THE VAULT'(g, s, x, y, w, h, t) {
      const ox = x + w * 0.66, oy = y + h / 2;
      glow(g, ox, oy, h, s.accent, 0.25);
      for (let i = 0; i < 5; i++) {
        const r = 9 + i * 12;
        g.save(); g.translate(ox, oy); g.rotate(Math.PI / 4 + (i % 2 ? 1 : -1) * t * 0.3);
        rrect(g, -r, -r, r * 2, r * 2, 3 + i * 1.5);
        g.strokeStyle = rgba(s.accent, 0.62 - i * 0.1); g.lineWidth = 2; g.stroke();
        g.restore();
      }
      for (const [k, ph] of [[0.28, 0], [0.74, 1.9]]) {
        const a = 0.25 + 0.45 * (0.5 + 0.5 * Math.sin(t * 2.4 + ph));
        rrect(g, x, y + h * k - 1.5, w, 3, 1.5); g.fillStyle = rgba(s.accent, a); g.fill();
      }
    },
    'THE VOID'(g, s, x, y, w, h, t) {
      const ox = x + w * 0.68, oy = y + h / 2, N = 7, Rm = Math.max(h, w * 0.4);
      glow(g, ox, oy, h * 0.9, s.accent, 0.3);
      g.lineWidth = 2;
      for (let i = 0; i < N; i++) {
        const u = 1 - ((i / N + t * 0.22) % 1);          // drawn in toward the middle
        circle(g, ox, oy, 8 + u * Rm);
        g.strokeStyle = rgba(s.accent, 0.55 * Math.sin(Math.PI * u) * (1 - u * 0.5)); g.stroke();
      }
      circle(g, ox, oy, 10); g.fillStyle = '#080410'; g.fill();
      g.strokeStyle = rgba(s.accent, 0.9); g.stroke();
    },
    'THE ARCHIVE'(g, s, x, y, w, h, t) {
      const rows = 5, rh = h / rows;
      for (let i = 0; i < rows; i++) {
        const lens = [0, 1, 2, 3, 4].map(j => 16 + ((i * 7 + j * 13) % 5) * 11);
        const period = lens.reduce((a, b) => a + b + 8, 0);
        for (const on of [false, true]) {
          let bx = x - ((t * (9 + i * 5)) % period), j = 0;
          g.beginPath();
          while (bx < x + w) {
            const len = lens[j % 5];
            if (((i * 3 + j) % 5 === 0) === on) rrectTo(g, bx, y + i * rh + rh * 0.28, len, rh * 0.44, rh * 0.22);
            bx += len + 8; j++;
          }
          g.fillStyle = rgba(s.accent, on ? 0.42 : 0.12); g.fill();
        }
      }
    },
    'THE MIRROR'(g, s, x, y, w, h, t) {
      const mx = x + w * 0.64;
      glow(g, mx, y + h / 2, h, s.accent, 0.2);
      for (let i = 0; i < 7; i++) {
        const p = TRIS[i + 9], span = h + 40;
        const yy = y - 20 + ((p.y * span + t * (8 + p.k * 12)) % span);
        const dx = 12 + p.x * w * 0.3, sz = 6 + p.s * 12;
        g.fillStyle = rgba(s.accent, 0.18 + 0.3 * p.k);
        tri(g, mx - dx, yy, sz, 0); g.fill();            // pointing at the line
        tri(g, mx + dx, yy, sz, Math.PI); g.fill();      // and its reflection
      }
      rrect(g, mx - 1.5, y, 3, h, 1.5); g.fillStyle = rgba(s.accent, 0.75); g.fill();
    }
  };
  const coverOf = s => COVERS[s.name] || ((g, s, x, y, w, h, t) =>
    triangles(g, x, y, w, h, t, { n: 12, lo: 8, hi: h * 0.6, speed: 8, col: rgb(s.accent), alpha: 0.3, seed: 5 }));

  /* One sector as a carousel panel, after lazer's beatmap panels: its name
     on the left, its cover on the right fading in under it. lit 0..1: the
     one drawn, outlined in its colour. */
  function sectorPanel(g, s, x, y, w, h, t, lit) {
    const r = 16;
    shadow(g, x, y, w, h, r);
    if (lit > 0) { rrect(g, x - 6, y - 6, w + 12, h + 12, r + 6); g.fillStyle = rgba(s.accent, 0.14 * lit); g.fill(); }
    g.save();
    rrect(g, x, y, w, h, r); g.clip();
    g.fillStyle = s.bg; g.fillRect(x, y, w, h);
    const cx0 = x + w * 0.3;
    coverOf(s)(g, s, cx0, y, w - w * 0.3, h, t);
    const fade = g.createLinearGradient(cx0, 0, x + w * 0.66, 0);
    fade.addColorStop(0, rgba(s.bg, 1)); fade.addColorStop(1, rgba(s.bg, 0));
    g.fillStyle = fade; g.fillRect(cx0, y, w * 0.36 + 1, h);
    rrect(g, x + 10, y + 14, 4, h - 28, 2); g.fillStyle = s.accent; g.fill();     // the accent strip
    g.restore();
    rrect(g, x + 0.5, y + 0.5, w - 1, h - 1, r);
    g.strokeStyle = lit > 0 ? rgba(s.accent, 0.25 + 0.75 * lit) : 'rgba(255,255,255,0.08)';
    g.lineWidth = 1 + lit * 1.5; g.stroke();
    text(g, s.name, x + 28, y + h / 2 - 9, FONT(800, 23), INK, 'left', 0.5);
    text(g, String(s.tag || '').toUpperCase(), x + 28, y + h / 2 + 15, FONT(700, 11), rgba(s.accent, 0.9), 'left', 2.4);
  }

  /* A sector's panel drawn once, still, as it looks at time `at`: what the
     carousel shows while it spins (nothing can be seen moving inside a panel
     going past that fast, and a clipped live panel costs a millisecond or
     so). Kept per sector, size and sharpness; drawn live until the fonts are
     in, so a fallback face is never kept. */
  const PANELS = new Map(), PANEL_PAD = 14;
  function panelImage(s, w, h, scale, at) {
    if (!document.fonts || document.fonts.status !== 'loaded') return null;
    scale = Math.ceil(scale * 4) / 4;
    const key = s.name + '|' + w + '|' + h + '|' + scale;
    let c = PANELS.get(key);
    if (!c) {
      if (PANELS.size > 48) PANELS.clear();
      c = document.createElement('canvas');
      c.width = Math.ceil((w + PANEL_PAD * 2) * scale); c.height = Math.ceil((h + PANEL_PAD * 2) * scale);
      const cg = c.getContext('2d');
      cg.scale(scale, scale); cg.translate(PANEL_PAD, PANEL_PAD);
      sectorPanel(cg, s, 0, 0, w, h, at, 0);
      PANELS.set(key, c);
    }
    return c;
  }

  /* ---------------------------- belt: its parts ---------------------------- */
  const QUEUE = { ranked: 'RANKED MATCH', casual: 'CASUAL MATCH', friend: 'FRIEND MATCH' };

  // the times of the belt's beats, scaled to its length
  const beats = D => {
    const k = (D || 4.8) / 4.8;
    return { spin0: 0.2 * k, spin1: 2.3 * k, ring0: 2.4 * k, tilt0: 2.5 * k, ball0: 2.6 * k, ball1: 3.75 * k, laps: 2 };
  };

  function carousel(g, d, cx, cy, pw, ph, step, t, B) {
    const n = d.maps.length, target = B.laps * n + d.pick;
    const pos = target * outCubic((t - B.spin0) / (B.spin1 - B.spin0));
    const landed = t >= B.spin1, gone = outQuint((t - B.spin1) / 0.45);
    const appear = outQuint((t - 0.05) / 0.55);
    const picked = d.maps[d.pick];
    // the rows near the middle, the farthest first so the middle is on top
    const rows = [];
    for (let i = Math.floor(pos) - 2; i <= Math.ceil(pos) + 2; i++) rows.push(i);
    rows.sort((a, b) => Math.abs(b - pos) - Math.abs(a - pos));
    const m = g.getTransform(), sharp = Math.hypot(m.a, m.b);
    for (const i of rows) {
      const off = i - pos, dist = Math.abs(off), chosen = landed && i === target;
      let a = clamp01(1 - (dist - 0.6) * 0.8) * appear;
      if (landed && !chosen) a *= 1 - gone;
      if (a <= 0.01) continue;
      const pop = chosen ? 0.05 * outBack((t - B.spin1) / 0.5) : 0;
      const sc = 1 - 0.07 * Math.min(dist, 2) + pop;
      g.save();
      g.globalAlpha = a;
      g.translate(cx, cy + off * step + (1 - appear) * 40);
      g.scale(sc, sc);
      const sector = d.maps[((i % n) + n) % n];
      // still while it goes past (as it will look when it lands), live once it has
      const img = chosen ? null : panelImage(sector, pw, ph, sharp, B.spin1);
      if (img) g.drawImage(img, -pw / 2 - PANEL_PAD, -ph / 2 - PANEL_PAD, pw + PANEL_PAD * 2, ph + PANEL_PAD * 2);
      else sectorPanel(g, sector, -pw / 2, -ph / 2, pw, ph, t, chosen ? outQuint((t - B.spin1) / 0.3) : 0);
      g.restore();
    }
    // the two markers either side of the middle row
    const k = landed ? outQuint((t - B.spin1) / 0.4) : 0;
    const mc = landed ? mix('#e2e8f0', picked.accent, k) : 'rgba(226,232,240,0.8)';
    g.globalAlpha = appear;
    for (const sd of [-1, 1]) {
      tri(g, cx + sd * (pw / 2 + 26 - 6 * k), cy, 9, sd < 0 ? 0 : Math.PI);
      g.fillStyle = mc; g.fill();
    }
    g.globalAlpha = 1;
    // a ripple when it lands
    const rk = (t - B.spin1) / 0.7;
    if (rk > 0 && rk < 1) {
      const e = outQuint(rk), grow = 6 + 30 * e, sc = 1.05;
      rrect(g, cx - pw * sc / 2 - grow, cy - ph * sc / 2 - grow, pw * sc + grow * 2, ph * sc + grow * 2, 16 + grow);
      g.strokeStyle = rgba(picked.accent, 0.75 * (1 - rk)); g.lineWidth = 2.5 * (1 - rk) + 0.5; g.stroke();
    }
  }

  // the variation's icons, in the middle of the ring: a tick, or a swarm closing in
  function cleanIcon(g, x, y, s, col) {
    g.beginPath(); g.moveTo(x - 11 * s, y + 1 * s); g.lineTo(x - 3.5 * s, y + 8 * s); g.lineTo(x + 11.5 * s, y - 8 * s);
    g.strokeStyle = col; g.lineWidth = 5 * s; g.lineCap = 'round'; g.lineJoin = 'round'; g.stroke();
  }
  function swarmIcon(g, x, y, s, col, t) {
    g.fillStyle = col;
    for (let i = 0; i < 9; i++) {
      const inner = i < 4, a = (inner ? -t * 1.3 : t * 0.9) + i * TAU / (inner ? 4 : 5);
      const rr = (inner ? 6.5 : 15) * s + Math.sin(t * 2.6 + i * 1.7) * 1.4 * s;
      circle(g, x + Math.cos(a) * rr, y + Math.sin(a) * rr, (inner ? 2.6 : 3.4 + hash(i) * 1.6) * s);
      g.fill();
    }
  }

  /* The variation: a ring split CLEAN / INFESTED by the odds (tipped from
     even by THE HACKER, while a chip says so), a marker spinning round it
     that stops on the side that was drawn, and the answer below. */
  function oddsRing(g, d, x, y, R, t, B) {
    const show = outQuint((t - B.ring0) / 0.5);
    if (show <= 0) return;
    const th = 12, a0 = -Math.PI / 2;
    const tilt = d.hackers ? outQuint((t - B.tilt0) / 0.5) : 1;
    const odds = 0.5 + ((d.odds === undefined ? 0.5 : d.odds) - 0.5) * tilt;
    const done = t >= B.ball1, res = outQuint((t - B.ball1) / 0.5);
    // where the marker stops: inside the drawn side, a seeded way along it
    const cleanEnd = 1 - d.odds;
    const r0 = hash(d.pick * 31 + d.hackers * 7 + (d.infested ? 3 : 0));
    const f = d.infested ? cleanEnd + d.odds * (0.22 + 0.56 * r0) : cleanEnd * (0.22 + 0.56 * r0);
    const u = clamp01((t - B.ball0) / (B.ball1 - B.ball0));
    const turns = (B.laps + f) * outCubic(u);
    const at = ((turns % 1) + 1) % 1;                     // where the marker is, 0..1 round from the top
    const over = t < B.ball0 ? -1 : at < 1 - odds ? 0 : 1;  // which side it is over
    const won = d.infested ? 1 : 0, wcol = won ? INFEST : CLEAN;

    g.save();
    g.globalAlpha = show;
    g.translate(x, y); g.scale(0.85 + 0.15 * show, 0.85 + 0.15 * show); g.translate(-x, -y);
    glow(g, x, y, R * 1.9, done ? wcol : '#94a3b8', 0.08 + 0.14 * res);
    circle(g, x, y, R - th - 6); g.fillStyle = 'rgba(255,255,255,0.03)'; g.fill();
    // the track, then the two sides
    circle(g, x, y, R); g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = th; g.stroke();
    const sides = [[0, 1 - odds, CLEAN], [1 - odds, 1, INFEST]];
    const gap = odds > 0.001 && odds < 0.999 ? 0.08 + th / R : 0;
    g.lineCap = gap ? 'round' : 'butt';
    sides.forEach(([s0, s1, col], i) => {
      if (s1 - s0 < 0.002) return;
      const b0 = a0 + TAU * s0 + gap / 2, b1 = Math.min(a0 + TAU * s1 - gap / 2, a0 + TAU * show);
      if (b1 <= b0) return;
      const mine = done && i === won, lost = done && i !== won;
      const a = lost ? 1 - 0.75 * res : over === i || mine ? 1 : 0.55;
      const lw = th + (mine ? 5 * res : 0);
      arc(g, x, y, R, b0, b1); g.strokeStyle = rgba(col, 0.14 * a); g.lineWidth = lw + 12; g.stroke();
      arc(g, x, y, R, b0, b1); g.strokeStyle = rgba(col, a); g.lineWidth = lw; g.stroke();
    });
    // the marker and its tail
    if (t >= B.ball0) {
      const ang = a0 + TAU * turns;
      const speed = (B.laps + f) * TAU * 3 * Math.pow(1 - u, 2) / (B.ball1 - B.ball0);   // d(angle)/dt
      const tail = Math.min(2.2, speed * 0.05);
      g.lineCap = 'round';
      for (let j = 0; j < 6 && tail > 0.02; j++) {
        arc(g, x, y, R, ang - tail * (j + 1) / 6, ang - tail * j / 6);
        g.strokeStyle = 'rgba(255,255,255,' + (0.5 * (1 - j / 6)) + ')'; g.lineWidth = 5 - j * 0.6; g.stroke();
      }
      const mx = x + Math.cos(ang) * R, my = y + Math.sin(ang) * R;
      glow(g, mx, my, 18, done ? wcol : '#ffffff', 0.5);
      circle(g, mx, my, 7 + 2 * res); g.fillStyle = '#ffffff'; g.fill();
      circle(g, mx, my, 7 + 2 * res); g.strokeStyle = done ? wcol : 'rgba(15,22,38,0.6)'; g.lineWidth = 2.5; g.stroke();
    }
    // the middle: a question, then the answer
    if (!done) text(g, '?', x, y + 1, FONT(800, 30), 'rgba(226,232,240,' + (0.3 + 0.2 * Math.sin(t * 6)) + ')');
    else {
      const s = outBack((t - B.ball1) / 0.45);
      g.save(); g.translate(x, y); g.scale(s, s);
      circle(g, 0, 0, R - th - 8); g.fillStyle = rgba(wcol, 0.14); g.fill();
      if (won) swarmIcon(g, 0, 0, 1.15, wcol, t); else cleanIcon(g, 0, 0, 1.15, wcol);
      g.restore();
    }
    // the two sides' names and chances
    sides.forEach(([s0, s1, col], i) => {
      const sx = x + (i ? 1 : -1) * (R + 34), al = i ? 'left' : 'right';
      const a = done ? (i === won ? 1 : 1 - 0.7 * res) : over === i ? 1 : 0.6;
      text(g, i ? 'INFESTED' : 'CLEAN', sx, y - 13, FONT(800, 14), rgba(col, a), al, 2.6);
      num(g, Math.round((s1 - s0) * 100) + '%', sx, y + 14, FONT(800, 28), rgba(col, a), al);
    });
    // what tipped it
    if (d.hackers) {
      const a = outQuint((t - B.tilt0) / 0.35);
      g.globalAlpha = show * a;
      const label = (d.hackers >= 2 ? 'TWO HACKERS' : 'THE HACKER') + '  +' + Math.round((d.odds - 0.5) * 100) + '%';
      chip(g, x + R + 34 + 6 * (1 - a), y + 50, label, HACKER, {
        h: 24, px: 10, fill: rgba(HACKER, 0.14), line: true,
        icon: (ix, iy, ir) => hull(g, d, 'hacker', ix + 1, iy, ir * 2.3, 1, HACKER)
      });
    }
    g.restore();

    // the answer, and why
    if (done) {
      const s = outBack((t - B.ball1) / 0.5), a = outQuint((t - B.ball1) / 0.3);
      g.save();
      g.globalAlpha = a;
      g.translate(x, y + R + 46); g.scale(0.8 + 0.2 * s, 0.8 + 0.2 * s);
      text(g, won ? 'INFESTED' : 'CLEAN', 0, 0, FONT(800, 34), wcol, 'center', 7);
      g.restore();
      const why = d.hackers >= 2 ? 'Two HACKERS: the room is always full.'
        : d.hackers === 1 ? (won ? 'THE HACKER is fighting: three rooms in four are infested.' : 'THE HACKER is fighting, and still the room is empty.')
        : won ? 'The room fights too: its enemies keep coming.' : 'Just the two of you.';
      g.globalAlpha = outQuint((t - B.ball1 - 0.15) / 0.4);
      text(g, why, x, y + R + 82, FONT(600, 16), '#94a3b8');
      g.globalAlpha = 1;
    }
  }

  /* --------------------------- result: its parts --------------------------- */
  /* When things first happened on a result screen, by its own clock: the
     outcome turning (to 'void', a moment after it shows), the verdict and the
     rating arriving. Kept per result, so each entrance plays from its moment. */
  const SEEN = new WeakMap();
  function seen(r, t) {
    let s = SEEN.get(r);
    if (!s) SEEN.set(r, s = { outcome: r.outcome, outAt: 0, verdictAt: null, ratingAt: null });
    if (r.outcome !== s.outcome) { s.outcome = r.outcome; s.outAt = t; }
    if (r.verdict && s.verdictAt === null) s.verdictAt = t;
    if (r.rating && s.ratingAt === null) s.ratingAt = t;
    return s;
  }

  /* The rounds as a ring, after lazer's accuracy circle: a slot per round the
     match could run to, each filling in turn in the colour of whoever took
     it, and the score in the middle. */
  function roundsRing(g, r, x, y, R, T, faded) {
    const slots = Math.max(r.bestOf || 3, r.rounds.length), th = 15;
    const show = outQuint((T - 0.2) / 0.6);
    const span = TAU / slots, gap = 0.1 + th / R;
    g.save();
    g.globalAlpha = show;
    circle(g, x, y, R - th - 8); g.fillStyle = 'rgba(255,255,255,0.03)'; g.fill();
    g.lineCap = 'round';
    for (let i = 0; i < slots; i++) {
      const b0 = -Math.PI / 2 + i * span + gap / 2, b1 = b0 + (span - gap) * show;
      arc(g, x, y, R, b0, b1); g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = th; g.stroke();
      const rd = r.rounds[i];
      if (!rd) continue;
      const p = outQuint((T - 0.55 - i * 0.2) / 0.55);
      if (p <= 0) continue;
      const col = faded ? '#94a3b8' : rd.won ? WIN : LOSS;
      const e = b0 + (span - gap) * p;
      arc(g, x, y, R, b0, e); g.strokeStyle = rgba(col, 0.15); g.lineWidth = th + 12; g.stroke();
      arc(g, x, y, R, b0, e); g.strokeStyle = col; g.lineWidth = th; g.stroke();
    }
    // the score
    const s = outBack((T - 0.4) / 0.55);
    g.translate(x, y - 6); g.scale(s, s);
    const big = FONT(800, 58);
    num(g, String(r.score[0]), -18, 0, big, INK, 'right');
    text(g, '–', 0, -2, FONT(700, 40), FAINT);
    num(g, String(r.score[1]), 18, 0, big, 'rgba(241,245,249,0.7)', 'left');
    text(g, 'BEST OF ' + (r.bestOf || 3), 0, 42, FONT(800, 11), DIM, 'center', 3);
    g.restore();
  }

  /* The referee's word, as a pill: waiting, recorded, no contest, or in
     ranked the rating rolling from before to after. */
  function refereePill(g, r, x, y, T, st) {
    const v = r.verdict, h = 42;
    const parts = [];                 // [width, draw(x)] in a row
    const word = (s, col, px = 12) => {
      const f = FONT(800, px), w = textW(g, s, f, 2.4);
      parts.push([w, px0 => text(g, s, px0, y + 0.5, f, col, 'left', 2.4)]);
    };
    const icon = (w, fn) => parts.push([w, fn]);
    let edge = 'rgba(255,255,255,0.1)', since = 0;
    if (!v) {
      icon(18, px0 => {
        const a = T * 5;
        arc(g, px0 + 9, y, 7, a, a + Math.PI * (1 + 0.5 * Math.sin(T * 2.5)));
        g.strokeStyle = TEXT; g.lineWidth = 2.5; g.lineCap = 'round'; g.stroke();
      });
      word('TELLING THE REFEREE', TEXT);
    } else if (v.v === 'void') {
      since = st.verdictAt; edge = rgba(LOSS, 0.5);
      icon(20, px0 => {
        circle(g, px0 + 10, y, 10); g.fillStyle = LOSS; g.fill();
        text(g, '!', px0 + 10, y + 0.5, FONT(800, 14), '#1b0a10');
      });
      word('NO CONTEST', LOSS);
      word('THE TWO GAMES DISAGREED', 'rgba(251,113,133,0.7)', 11);
    } else if (r.rating) {
      const R = r.rating, d = R.after - R.before;
      since = st.ratingAt;
      const k = outQuint((T - st.ratingAt - 0.3) / 1.4);
      const shown = Math.round(R.before + d * k);
      if (R.league) {
        icon(22, px0 => gem(g, px0 + 11, y, 11, R.league));
        word(R.league.toUpperCase(), (METAL[R.league] || METAL.silver)[1]);
      } else {
        const of = (R.games || 0) + (R.left || 0);
        icon(Math.max(0, of * 12 - 4), px0 => {
          for (let i = 0; i < of; i++) {
            circle(g, px0 + 4 + i * 12, y, 4);
            g.fillStyle = i < R.games ? PINK : 'rgba(255,255,255,0.12)'; g.fill();
          }
        });
        word('PLACEMENT ' + R.games + ' OF ' + of, PINK);
      }
      const nf = FONT(800, 22);
      g.font = nf;
      const nw = g.measureText('0').width * String(Math.max(R.before, R.after)).length;
      parts.push([nw, px0 => num(g, String(shown), px0, y + 1, nf, INK, 'left')]);
      const dl = (d >= 0 ? '+' : '−') + Math.abs(d), dc = d >= 0 ? WIN : LOSS;
      const dw = chip(g, 0, 0, dl, dc, { measure: true, h: 24, px: 12 });
      parts.push([dw, px0 => {
        g.save(); g.globalAlpha *= outQuint((T - st.ratingAt - 1.2) / 0.4);
        chip(g, px0, y, dl, dc, { h: 24, px: 12, fill: rgba(dc, 0.18) });
        g.restore();
      }]);
    } else {
      since = st.verdictAt;
      icon(20, px0 => {
        circle(g, px0 + 10, y, 10); g.fillStyle = WIN; g.fill();
        cleanIcon(g, px0 + 10, y, 0.42, '#0b1a10');
      });
      if (v.v === 'forfeit') word(v.won ? 'A WIN BY FORFEIT' : v.won === false ? 'A LOSS BY FORFEIT' : 'FORFEIT', TEXT);
      word('RECORDED', WIN);
    }
    const gap = 12, pad = 20;
    const inner = parts.reduce((a, p) => a + p[0], 0) + gap * (parts.length - 1);
    const w = inner + pad * 2;
    g.save();
    g.globalAlpha *= outQuint((T - since) / 0.45);
    rrect(g, x - w / 2, y - h / 2, w, h, h / 2);
    g.fillStyle = 'rgba(15,22,38,0.92)'; g.fill();
    g.strokeStyle = edge; g.lineWidth = 1; g.stroke();
    let px0 = x - inner / 2;
    for (const [pw, draw] of parts) { draw(px0); px0 += pw + gap; }
    g.restore();
  }

  /* -------------------------------- the hooks ------------------------------ */
  // the design frames each screen is laid out on, scaled to fit the window
  const FRAME = { belt: [1180, 650], result: [1180, 630] };

  window.PVP_ART = {
    belt(g, w, h, t, d) {
      const B = beats(d.dur);
      const picked = d.maps[d.pick] || d.maps[0];
      const land = outQuint((t - B.spin1) / 0.8);
      const me = d.me, them = d.them;

      // behind it all, full bleed: each side's colour, the drawn one's after it lands, triangles
      if (me && them) {
        glow(g, w * 0.1, h * 0.55, Math.max(w, h) * 0.5, me.col, 0.12);
        glow(g, w * 0.9, h * 0.55, Math.max(w, h) * 0.5, them.col, 0.12);
      }
      glow(g, w / 2, h * 0.45, Math.max(w, h) * 0.55, picked.accent, 0.14 * land);
      triangles(g, 0, 0, w, h, t, { n: 36, lo: 24, hi: Math.min(200, Math.max(w, h) * 0.14), speed: 18,
        col: mixc(rgb('#94a3b8'), rgb(picked.accent), land), alpha: 0.045, seed: 7, line: 4 });

      const [DW, DH] = FRAME.belt;
      const s = Math.min(w / DW, h / DH, 1.4), W = w / s, H = h / s;
      g.scale(s, s);
      g.translate(0, Math.max(0, (H - DH) / 2));
      const cx = W / 2;

      // the header: what kind of match, and the VS badge between its chips
      const head = outQuint(t / 0.5);
      g.globalAlpha = head;
      text(g, QUEUE[d.queue] || 'MATCH', cx, 22, FONT(800, 12), DIM, 'center', 4);
      const vy = 64;
      const left = d.league ? { label: d.league.n + ' LEAGUE', col: (METAL[d.league.id] || METAL.silver)[1], o: { icon: gemIcon(d.league.id)(g) } }
        : { label: d.rated ? 'RATED' : 'UNRATED', col: '#94a3b8' };
      const lw = chip(g, 0, 0, left.label, left.col, Object.assign({ measure: true }, left.o));
      chip(g, cx - 40 - lw, vy, left.label, left.col, left.o || {});
      chip(g, cx + 40, vy, 'BEST OF ' + (d.bestOf || 3), '#e2e8f0', { fill: 'rgba(226,232,240,0.1)' });
      const vs = outBack((t - 0.25) / 0.5);
      g.save(); g.translate(cx, vy); g.scale(vs, vs);
      circle(g, 0, 0, 25); g.fillStyle = PINK; g.fill();
      circle(g, 0, 0, 30); g.strokeStyle = rgba(PINK, 0.3); g.lineWidth = 3; g.stroke();
      text(g, 'VS', 0, 1, FONT(800, 17), '#ffffff', 'center', 1);
      g.restore();
      g.globalAlpha = 1;

      // the pilots' cards, sliding in from either side
      const cy = 290, CW = 232, CH = 282, cardY = 186;
      if (me && them) {
        [[me, 52, 1, 0, 'YOU', PINK], [them, W - 52 - CW, -1, 0.08, null, null]].forEach(([p, x, dir, delay, tag, tagCol], i) => {
          const e = outQuint((t - delay) / 0.75);
          g.save();
          g.globalAlpha = clamp01(e * 1.4);
          g.translate(-dir * (1 - e) * (CW + 90), 0);
          pilotCard(g, d, p, x, cardY, CW, CH, t, { dir, cover: 110, R: 48, tag, tagCol, seed: i * 17 });
          g.restore();
        });
      }

      // the sectors, spinning, then the one drawn
      carousel(g, d, cx, cy, 440, 80, 92, t, B);

      // clean or infested
      oddsRing(g, d, cx, cy + 196, 54, t, B);
    },

    result(g, w, h, t, r) {
      const st = seen(r, t);
      const T = STILL ? t + 99 : t;                  // the entrances' clock
      const O = OUT[r.outcome] || OUT.void, faded = r.outcome === 'void';
      const te = T - st.outAt;                        // since the outcome showed (or turned)

      // behind it all, full bleed: the outcome's light, triangles, the arena's colour low down
      glow(g, w / 2, h * 0.1, Math.max(w, h) * 0.75, O.b, 0.16 * outQuint(te / 0.8));
      triangles(g, 0, 0, w, h, t, { n: 36, lo: 26, hi: Math.min(210, Math.max(w, h) * 0.14), speed: 16,
        col: rgb(O.b), alpha: 0.05, seed: 3, line: 4 });
      if (r.map) glow(g, w / 2, h * 1.05, Math.max(w, h) * 0.6, r.map.accent, 0.09);

      const [DW, DH] = FRAME.result;
      const avail = Math.max(240, h - 90);
      const s = Math.min(w / DW, avail / DH, 1.4), W = w / s, A = avail / s;
      g.scale(s, s);
      g.translate(0, Math.max(0, (A - DH) * 0.45));
      const cx = W / 2;

      // the outcome
      const e = outQuint(te / 0.6);
      glow(g, cx, 58, 300, O.b, 0.16 * e);
      g.save();
      g.globalAlpha = clamp01(te / 0.35);
      g.translate(cx, 58); g.scale(1 + 0.22 * (1 - e), 1 + 0.22 * (1 - e));
      const tf = FONT(800, 76);
      const grad = g.createLinearGradient(0, -34, 0, 34);
      grad.addColorStop(0, O.a); grad.addColorStop(1, O.b);
      text(g, O.word, 0, 0, tf, grad, 'center', 6);
      g.restore();
      const bw = 150 * outQuint((te - 0.15) / 0.6);
      if (bw > 1) { rrect(g, cx - bw / 2, 104, bw, 4, 2); g.fillStyle = O.b; g.fill(); }

      // what kind of match
      g.globalAlpha = outQuint((T - 0.2) / 0.5);
      const chips = [{ label: r.queue === 'ranked' ? 'RANKED' : r.queue === 'casual' ? 'CASUAL' : 'FRIEND MATCH', col: '#e2e8f0', o: { fill: 'rgba(226,232,240,0.1)' } }];
      if (r.league) chips.push({ label: r.league.n + ' LEAGUE', col: (METAL[r.league.id] || METAL.silver)[1], o: { icon: gemIcon(r.league.id)(g) } });
      chips.push({ label: r.rated ? 'RATED' : 'UNRATED', col: '#94a3b8' });
      chipRow(g, cx, 136, chips);
      g.globalAlpha = 1;

      // the pilots either side of the rounds
      const ringY = 292, CW = 236, CH = 214, cardY = ringY - 108;
      const iWon = r.outcome === 'won' || r.outcome === 'left', theyWon = r.outcome === 'lost';
      [[r.me, cx - 170 - CW, 1, 0.12, true], [r.them, cx + 170, -1, 0.2, false]].forEach(([p, x, dir, delay, mine], i) => {
        if (!p) return;
        const k = outQuint((T - delay) / 0.75);
        const won = !faded && (mine ? iWon : theyWon), gone = !mine && r.outcome === 'left';
        g.save();
        g.globalAlpha = clamp01(k * 1.4) * (faded || won || gone ? 1 : 0.8);
        g.translate(-dir * (1 - k) * 80, 0);
        pilotCard(g, r, p, x, cardY, CW, CH, t, {
          dir, cover: 78, R: 38, seed: i * 17 + 5, dim: gone,
          tag: mine ? 'YOU' : null, tagCol: PINK,
          badge: won ? 'WINNER' : gone ? 'LEFT' : null, badgeCol: won ? '#fbbf24' : '#94a3b8',
          badgeFill: won ? 0.95 : 0.2, badgeInk: won ? '#0b1020' : '#cbd5e1',
          ring: won ? '#fbbf24' : null
        });
        g.restore();
      });
      roundsRing(g, r, cx, ringY, 94, T, faded);

      // the numbers, after lazer's statistics: a coloured heading, the value rolling up
      const dealt = r.dealt || [0, 0], total = Math.max(1, dealt[0] + dealt[1]);
      const cols = [
        { k: 'DEALT', col: WIN, w: 160, v: n => thousands(dealt[0] * n), bar: dealt[0] / total },
        { k: 'TAKEN', col: LOSS, w: 160, v: n => thousands(dealt[1] * n), bar: dealt[1] / total },
        { k: 'FIGHT TIME', col: CLEAN, w: 160, v: n => clock((r.time || 0) * n), sub: r.rounds.length + (r.rounds.length === 1 ? ' ROUND' : ' ROUNDS') },
        { k: 'ARENA', col: r.map ? r.map.accent : '#94a3b8', w: 230, name: r.map ? r.map.name : '—', sub: r.infested ? 'INFESTED' : 'CLEAN', subCol: r.infested ? INFEST : CLEAN }
      ];
      const sy = 440, totalW = cols.reduce((a, c) => a + c.w, 0);
      let x = cx - totalW / 2;
      cols.forEach((c, i) => {
        const k = outQuint((T - 0.8 - i * 0.08) / 0.5), roll = outQuint((T - 0.9) / 1.2);
        const mx = x + c.w / 2;
        g.save();
        g.globalAlpha = k;
        g.translate(0, (1 - k) * 14);
        if (i) { rrect(g, x - 0.5, sy - 8, 1, 74, 0.5); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill(); }
        text(g, c.k, mx, sy, FONT(800, 11), c.col, 'center', 3);
        if (c.name) text(g, c.name, mx, sy + 30, FONT(800, fitPx(g, c.name, 800, 24, c.w - 20)), INK);
        else num(g, c.v(roll), mx, sy + 30, FONT(700, 30), INK);
        if (c.bar !== undefined) {
          rrect(g, mx - 45, sy + 56, 90, 5, 2.5); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
          const bwid = 90 * c.bar * roll;
          if (bwid > 1) { rrect(g, mx - 45, sy + 56, bwid, 5, 2.5); g.fillStyle = c.col; g.fill(); }
        } else if (c.sub) text(g, c.sub, mx, sy + 58, FONT(800, 10), c.subCol || DIM, 'center', 2.4);
        g.restore();
        x += c.w;
      });

      // a tile per round: when it ended, who took it, the winner's health left
      const n = r.rounds.length, tw = 118, tg = 10, ty = 520, tH = 58;
      if (!n) {
        g.globalAlpha = outQuint((T - 1.1) / 0.5);
        text(g, 'NO ROUND WAS FINISHED', cx, ty + tH / 2, FONT(800, 11), FAINT, 'center', 3);
        g.globalAlpha = 1;
      }
      let tx = cx - (n * tw + (n - 1) * tg) / 2;
      r.rounds.forEach((rd, i) => {
        const k = outQuint((T - 1.1 - i * 0.07) / 0.5), col = faded ? '#94a3b8' : rd.won ? WIN : LOSS;
        g.save();
        g.globalAlpha = k;
        g.translate(0, (1 - k) * 12);
        rrect(g, tx, ty, tw, tH, 12); g.fillStyle = 'rgba(255,255,255,0.04)'; g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.07)'; g.lineWidth = 1; g.stroke();
        text(g, 'ROUND ' + (i + 1), tx + 12, ty + 15, FONT(800, 10), DIM, 'left', 2);
        num(g, clock(rd.at), tx + tw - 12, ty + 15, FONT(700, 11), DIM, 'right');
        rrect(g, tx + 12, ty + 27, tw - 24, 6, 3); g.fillStyle = 'rgba(255,255,255,0.08)'; g.fill();
        const hw = (tw - 24) * clamp01(rd.left) * outQuint((T - 1.3 - i * 0.07) / 0.8);
        if (hw > 1) { rrect(g, tx + 12, ty + 27, hw, 6, 3); g.fillStyle = col; g.fill(); }
        text(g, rd.won ? 'WON' : 'LOST', tx + 12, ty + 45, FONT(800, 11), col, 'left', 1.6);
        text(g, Math.round(clamp01(rd.left) * 100) + '% HP', tx + tw - 12, ty + 45, FONT(700, 11), rgba(col, 0.8), 'right');
        g.restore();
        tx += tw + tg;
      });

      // the referee's word, and in ranked the rating
      g.globalAlpha = outQuint((T - 0.6) / 0.5);
      refereePill(g, r, cx, 610, T, st);
      g.globalAlpha = 1;
    }
  };
})();
