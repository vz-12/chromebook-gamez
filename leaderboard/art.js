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
     theme                          colours and fonts, poured into the page's
                                    CSS variables once at load (see below)
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
     league(g, w, h, t, id)         a league's crest, on the PVP tab. id =
                                    'bronze' | 'silver' | 'gold' |
                                    'platinum' | 'void'                   64 × 64

   Everything else (layout, tabs, the table's lines) is plain CSS in
   leaderboard.css and reads the theme's variables.
   ========================================================================= */
(() => {
  'use strict';

  const TAU = Math.PI * 2;
  const MEDAL = { 1: '#fbbf24', 2: '#cbd5e1', 3: '#d97706' };
  const LEAGUE = {
    bronze:   { col: '#d97706', name: 'BRONZE' },
    silver:   { col: '#cbd5e1', name: 'SILVER' },
    gold:     { col: '#fbbf24', name: 'GOLD' },
    platinum: { col: '#67e8f9', name: 'PLATINUM' },
    void:     { col: '#c084fc', name: 'VOID' }
  };

  const rgba = (hex, a) => {
    const n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  };
  const poly = (g, x, y, r, sides, rot) => {
    g.beginPath();
    for (let i = 0; i < sides; i++) {
      const a = rot + i * TAU / sides;
      i ? g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r) : g.moveTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
    }
    g.closePath();
  };
  // the pilot's arrowhead, nose up, centred on (x, y), s = half its length
  const ship = (g, x, y, s) => {
    g.beginPath();
    g.moveTo(x, y - s);
    g.lineTo(x + s * 0.72, y + s * 0.78);
    g.lineTo(x, y + s * 0.38);
    g.lineTo(x - s * 0.72, y + s * 0.78);
    g.closePath();
  };
  // a name squeezed to fit, one character at a time
  const fit = (g, text, max) => {
    let s = String(text);
    if (g.measureText(s).width <= max) return s;
    while (s.length > 1 && g.measureText(s + '…').width > max) s = s.slice(0, -1);
    return s + '…';
  };
  // a fixed sky: the same stars every load, so nothing jumps on a refresh
  const STARS = (() => {
    let seed = 1337;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const out = [];
    for (let i = 0; i < 170; i++) out.push({ x: r(), y: r(), z: 0.2 + r() * 0.8, p: r() * TAU });
    return out;
  })();

  window.LB_ART = {

    /* The page's colours and fonts. Each key is a CSS variable (--bg, --cyan…)
       that leaderboard.css reads; leave one out and the stylesheet's own
       value stands. */
    theme: {
      'bg': '#05060a',
      'panel': 'rgba(8, 13, 22, .88)',
      'line': 'rgba(103, 232, 249, .2)',
      'line-hi': 'rgba(103, 232, 249, .6)',
      'cyan': '#67e8f9',
      'ink': '#e2e8f0',
      'text': '#cbd5e1',
      'dim': '#64748b',
      'faint': '#334155',
      'gold': '#fbbf24',
      'silver': '#cbd5e1',
      'bronze': '#d97706',
      'bad': '#f87171'
    },

    /* The void behind the page: stars drifting at three depths, the menu's
       slow rings over the title, a cyan horizon low down, and a vignette. */
    backdrop(g, w, h, t) {
      const sky = g.createLinearGradient(0, 0, 0, h);
      sky.addColorStop(0, '#070912');
      sky.addColorStop(1, '#04050a');
      g.fillStyle = sky;
      g.fillRect(0, 0, w, h);

      // rings around where the crest sits
      const cx = w / 2, cy = 70;
      g.lineWidth = 1;
      for (let i = 0; i < 4; i++) {
        const r = 120 + i * 90 + Math.sin(t * 0.4 + i) * 6;
        g.strokeStyle = rgba('#67e8f9', 0.05 - i * 0.009);
        g.setLineDash([2 + i * 2, 10 + i * 6]);
        g.lineDashOffset = -t * (6 + i * 3) * (i % 2 ? -1 : 1);
        g.beginPath(); g.arc(cx, cy, r, 0, TAU); g.stroke();
      }
      g.setLineDash([]);

      for (const s of STARS) {
        const x = ((s.x * w - t * 6 * s.z) % w + w) % w;
        const y = ((s.y * h + t * 3 * s.z) % h + h) % h;
        const a = 0.18 + 0.5 * s.z * (0.6 + 0.4 * Math.sin(t * 1.3 + s.p));
        g.fillStyle = s.z > 0.85 ? rgba('#a5f3fc', a) : rgba('#cbd5e1', a * 0.7);
        const r = s.z > 0.85 ? 1.4 : 0.9;
        g.fillRect(x - r / 2, y - r / 2, r, r);
      }

      const hz = g.createRadialGradient(w / 2, h * 1.05, 0, w / 2, h * 1.05, Math.max(w, h) * 0.7);
      hz.addColorStop(0, 'rgba(103,232,249,0.07)');
      hz.addColorStop(1, 'rgba(103,232,249,0)');
      g.fillStyle = hz;
      g.fillRect(0, 0, w, h);

      const vig = g.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
      vig.addColorStop(0, 'rgba(0,0,0,0)');
      vig.addColorStop(1, 'rgba(0,0,0,0.55)');
      g.fillStyle = vig;
      g.fillRect(0, 0, w, h);
    },

    /* The emblem: a hexagon turning one way, the pilot's delta the other,
       and a pulse ring going out every few seconds. */
    crest(g, w, h, t) {
      const x = w / 2, y = h / 2, r = Math.min(w, h) * 0.42;
      const pulse = (t % 3.2) / 3.2;
      g.strokeStyle = rgba('#67e8f9', 0.35 * (1 - pulse));
      g.lineWidth = 1;
      poly(g, x, y, r * (0.9 + pulse * 0.5), 6, -Math.PI / 2);
      g.stroke();

      g.save();
      g.shadowColor = '#f472b6'; g.shadowBlur = 14;
      g.strokeStyle = rgba('#f472b6', 0.85); g.lineWidth = 1.8;
      poly(g, x, y, r, 6, t * 0.15 - Math.PI / 2);
      g.stroke();
      g.restore();

      g.save();
      g.shadowColor = '#67e8f9'; g.shadowBlur = 16;
      g.strokeStyle = '#67e8f9'; g.lineWidth = 1.6;
      const a = -t * 0.25 - Math.PI / 2;
      poly(g, x, y, r * 0.66, 3, a);
      g.stroke();
      g.beginPath();
      for (let i = 0; i < 3; i++) {
        g.moveTo(x, y);
        g.lineTo(x + Math.cos(a + i * TAU / 3) * r * 0.66, y + Math.sin(a + i * TAU / 3) * r * 0.66);
      }
      g.strokeStyle = rgba('#67e8f9', 0.45); g.lineWidth = 1;
      g.stroke();
      g.restore();

      g.fillStyle = '#e0f2fe';
      g.beginPath(); g.arc(x, y, 2.2 + Math.sin(t * 3) * 0.6, 0, TAU); g.fill();
    },

    /* The top three on their plinths: 2nd, 1st, 3rd, each ship hovering in
       its own light, its name and score above it. */
    podium(g, w, h, t, top) {
      const n = top.length;
      if (!n) return;
      const col = Math.min(220, w / 3.3);
      const base = h - 14;
      const spots = { 1: { x: w / 2, ph: 74 }, 2: { x: w / 2 - col, ph: 52 }, 3: { x: w / 2 + col, ph: 38 } };
      // places, not ranks: a tie for first still stands two plinths
      top.forEach((p, i) => {
        const place = i + 1, s = spots[place];
        const c = MEDAL[Math.min(3, p.rank)] || '#67e8f9';
        const pw = Math.min(col - 18, 168), x = s.x;
        const top0 = base - s.ph;

        // the beam
        const beam = g.createLinearGradient(0, top0 - 130, 0, top0);
        beam.addColorStop(0, rgba(c, 0));
        beam.addColorStop(1, rgba(c, 0.16 + 0.04 * Math.sin(t * 2 + i)));
        g.fillStyle = beam;
        g.beginPath();
        g.moveTo(x - pw * 0.18, top0 - 130); g.lineTo(x + pw * 0.18, top0 - 130);
        g.lineTo(x + pw * 0.42, top0); g.lineTo(x - pw * 0.42, top0);
        g.fill();

        // the plinth: a lit top face and a front with the place on it
        const d = 9;
        g.fillStyle = rgba(c, 0.22);
        g.beginPath();
        g.moveTo(x - pw / 2, top0); g.lineTo(x + pw / 2, top0);
        g.lineTo(x + pw / 2 - d, top0 - d); g.lineTo(x - pw / 2 + d, top0 - d);
        g.closePath(); g.fill();
        const face = g.createLinearGradient(0, top0, 0, base);
        face.addColorStop(0, rgba(c, 0.2));
        face.addColorStop(1, rgba(c, 0.02));
        g.fillStyle = face;
        g.fillRect(x - pw / 2, top0, pw, s.ph);
        g.strokeStyle = rgba(c, 0.75); g.lineWidth = 1.2;
        g.strokeRect(x - pw / 2 + 0.5, top0 + 0.5, pw - 1, s.ph - 1);
        g.font = "700 " + (place === 1 ? 30 : 22) + "px 'Chakra Petch', Barlow, sans-serif";
        g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillStyle = rgba(c, 0.9);
        g.fillText(String(p.rank), x, top0 + s.ph / 2 + 1);

        // the ship, bobbing, with its engine
        const sy = top0 - 30 + Math.sin(t * 1.6 + i * 1.7) * 4;
        const ss = place === 1 ? 15 : 12;
        g.fillStyle = rgba(c, 0.25 + 0.15 * Math.sin(t * 9 + i));
        g.beginPath();
        g.moveTo(x - ss * 0.3, sy + ss * 0.5); g.lineTo(x + ss * 0.3, sy + ss * 0.5);
        g.lineTo(x, sy + ss * (1.2 + 0.25 * Math.sin(t * 14 + i)));
        g.fill();
        g.save();
        g.shadowColor = c; g.shadowBlur = 14;
        ship(g, x, sy, ss);
        g.fillStyle = '#05060a'; g.fill();
        g.strokeStyle = c; g.lineWidth = 1.6; g.stroke();
        g.restore();

        // the name and the score
        const ny = sy - ss - (place === 1 ? 36 : 30);
        g.font = "700 " + (place === 1 ? 15 : 13) + "px 'JetBrains Mono', monospace";
        g.fillStyle = place === 1 ? c : '#e2e8f0';
        g.fillText(fit(g, p.name, pw), x, ny);
        g.font = "500 11px 'JetBrains Mono', monospace";
        g.fillStyle = '#94a3b8';
        g.fillText(Number(p.score).toLocaleString('en-US') + (p.account ? '  ◆' : ''), x, ny + 17);
        if (place === 1) {                     // a crown for the one on top
          const cy = ny - 20;
          g.strokeStyle = c; g.lineWidth = 1.5;
          g.beginPath();
          g.moveTo(x - 10, cy + 5); g.lineTo(x - 10, cy - 3); g.lineTo(x - 5, cy + 1);
          g.lineTo(x, cy - 6); g.lineTo(x + 5, cy + 1); g.lineTo(x + 10, cy - 3); g.lineTo(x + 10, cy + 5);
          g.closePath(); g.stroke();
          // and a few sparks rising off the plinth
          for (let k = 0; k < 6; k++) {
            const life = (t * 0.5 + k / 6) % 1;
            const sx = x + Math.sin(k * 2.3 + t * 0.7) * pw * 0.35;
            g.fillStyle = rgba(c, 0.7 * (1 - life));
            g.fillRect(sx, top0 - 6 - life * 70, 1.6, 1.6);
          }
        }
      });
      g.textAlign = 'left'; g.textBaseline = 'alphabetic';
    },

    /* A hexagonal badge in the place's metal, the number on it, a glint
       across it now and then. */
    medal(g, w, h, t, rank) {
      const c = MEDAL[rank] || '#67e8f9';
      const x = w / 2, y = h / 2, r = Math.min(w, h) / 2 - 1;
      if (r < 3) return;
      poly(g, x, y, r, 6, Math.PI / 6);
      const fill = g.createLinearGradient(0, 0, 0, h);
      fill.addColorStop(0, c);
      fill.addColorStop(1, rgba(c, 0.55));
      g.fillStyle = fill; g.fill();
      g.save();
      g.clip();
      const sweep = ((t * 0.35 + rank * 0.2) % 1.6) - 0.3;
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath();
      g.moveTo(w * sweep, 0); g.lineTo(w * sweep + 6, 0); g.lineTo(w * sweep - 4, h); g.lineTo(w * sweep - 10, h);
      g.fill();
      g.restore();
      g.font = "800 12px 'JetBrains Mono', monospace";
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#05060a';
      g.fillText(String(rank), x, y + 1);
    },

    /* HUD brackets in the corners, a scan line going down, and the place's
       metal along the left edge when it is a podium place. */
    card(g, w, h, t, c) {
      const accent = c.rank && c.rank <= 3 ? MEDAL[c.rank] : '#67e8f9';
      const k = 10;
      g.strokeStyle = rgba(accent, c.rank ? 0.7 : 0.25); g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(1, k); g.lineTo(1, 1); g.lineTo(k, 1);
      g.moveTo(w - k, 1); g.lineTo(w - 1, 1); g.lineTo(w - 1, k);
      g.moveTo(w - 1, h - k); g.lineTo(w - 1, h - 1); g.lineTo(w - k, h - 1);
      g.moveTo(k, h - 1); g.lineTo(1, h - 1); g.lineTo(1, h - k);
      g.stroke();
      if (!c.rank) return;
      const sy = (t * 22) % (h + 30) - 15;
      const scan = g.createLinearGradient(0, sy - 15, 0, sy + 15);
      scan.addColorStop(0, rgba(accent, 0));
      scan.addColorStop(0.5, rgba(accent, 0.07));
      scan.addColorStop(1, rgba(accent, 0));
      g.fillStyle = scan;
      g.fillRect(0, sy - 15, w, 30);
      if (c.rank <= 3) {
        const edge = g.createLinearGradient(0, 0, 40, 0);
        edge.addColorStop(0, rgba(accent, 0.22));
        edge.addColorStop(1, rgba(accent, 0));
        g.fillStyle = edge;
        g.fillRect(0, 0, 40, h);
      }
    },

    /* Small scenes for a board with nothing to show. */
    empty(g, w, h, t, kind) {
      const x = w / 2, y = h / 2;
      if (kind === 'loading') {            // a radar sweep
        g.strokeStyle = 'rgba(103,232,249,0.2)'; g.lineWidth = 1;
        for (const r of [14, 26, 38]) { g.beginPath(); g.arc(x, y, r, 0, TAU); g.stroke(); }
        const a = t * 2.4;
        g.fillStyle = 'rgba(103,232,249,0.18)';
        g.beginPath(); g.moveTo(x, y); g.arc(x, y, 38, a - 0.7, a); g.closePath(); g.fill();
        g.strokeStyle = '#67e8f9';
        g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(a) * 38, y + Math.sin(a) * 38); g.stroke();
      } else if (kind === 'error') {       // a signal that breaks off
        g.strokeStyle = '#f87171'; g.lineWidth = 1.5;
        g.beginPath();
        for (let i = 0; i <= 24; i++) {
          const px = x - 60 + i * 5;
          const glitch = (Math.floor(t * 8) + i) % 7 === 0 ? 10 : 0;
          const py = y + Math.sin(i * 0.9 + t * 4) * 8 + (i > 12 && i < 16 ? glitch : 0);
          i ? g.lineTo(px, py) : g.moveTo(px, py);
          if (i === 13) { g.stroke(); g.beginPath(); g.moveTo(px + 6, py); }
        }
        g.stroke();
      } else if (kind === 'pvp') {         // two pilots squaring up
        const gap = 46 + Math.sin(t * 1.5) * 4;
        for (const [sx, c, dir] of [[x - gap, '#67e8f9', 1], [x + gap, '#f87171', -1]]) {
          g.save();
          g.translate(sx, y); g.rotate(dir * Math.PI / 2);
          g.shadowColor = c; g.shadowBlur = 10;
          ship(g, 0, 0, 12);
          g.fillStyle = '#05060a'; g.fill();
          g.strokeStyle = c; g.lineWidth = 1.5; g.stroke();
          g.restore();
        }
        const flick = 0.5 + 0.5 * Math.sin(t * 20);
        g.strokeStyle = 'rgba(255,255,255,' + (0.3 + 0.4 * flick) + ')';
        g.beginPath(); g.moveTo(x - gap + 14, y); g.lineTo(x + gap - 14, y); g.stroke();
        g.fillStyle = '#fef3c7';
        g.beginPath(); g.arc(x, y, 2 + flick * 2, 0, TAU); g.fill();
      } else {                             // 'empty': one ship, nobody else out here
        const sx = x + Math.sin(t * 0.6) * 30, sy = y + Math.cos(t * 0.8) * 6;
        g.setLineDash([2, 5]);
        g.strokeStyle = 'rgba(103,232,249,0.3)';
        g.beginPath(); g.moveTo(sx - 50, sy + 10); g.quadraticCurveTo(sx - 20, sy + 14, sx - 8, sy + 4); g.stroke();
        g.setLineDash([]);
        g.save();
        g.translate(sx, sy); g.rotate(Math.PI / 2 + Math.sin(t * 0.6) * 0.15);
        ship(g, 0, 0, 10);
        g.strokeStyle = '#67e8f9'; g.lineWidth = 1.4; g.stroke();
        g.restore();
      }
    },

    /* A league's crest: shields with a chevron per step for the metals,
       a winged diamond for platinum, and a hexagon with a black core for
       the void. */
    league(g, w, h, t, id) {
      const L = LEAGUE[id] || LEAGUE.bronze;
      const x = w / 2, y = h / 2, s = Math.min(w, h) / 2 - 3;
      if (s < 4) return;
      g.save();
      g.shadowColor = L.col; g.shadowBlur = 8;
      g.strokeStyle = L.col; g.lineWidth = 1.6;
      g.fillStyle = rgba(L.col, 0.1);
      if (id === 'void') {
        poly(g, x, y, s, 6, t * 0.2);
        g.fill(); g.stroke();
        g.shadowBlur = 0;
        g.fillStyle = '#000';
        g.beginPath(); g.arc(x, y, s * 0.42, 0, TAU); g.fill();
        g.strokeStyle = rgba(L.col, 0.8); g.lineWidth = 1;
        g.beginPath(); g.ellipse(x, y, s * 0.62, s * 0.22, -t * 0.6, 0, TAU); g.stroke();
      } else if (id === 'platinum') {
        g.beginPath();
        g.moveTo(x, y - s); g.lineTo(x + s * 0.55, y); g.lineTo(x, y + s); g.lineTo(x - s * 0.55, y);
        g.closePath(); g.fill(); g.stroke();
        g.beginPath();
        g.moveTo(x - s * 0.6, y - s * 0.1); g.lineTo(x - s, y - s * 0.45); g.lineTo(x - s * 0.75, y + s * 0.15);
        g.moveTo(x + s * 0.6, y - s * 0.1); g.lineTo(x + s, y - s * 0.45); g.lineTo(x + s * 0.75, y + s * 0.15);
        g.stroke();
      } else {
        const steps = id === 'gold' ? 3 : id === 'silver' ? 2 : 1;
        g.beginPath();
        g.moveTo(x - s * 0.75, y - s * 0.8); g.lineTo(x + s * 0.75, y - s * 0.8);
        g.lineTo(x + s * 0.75, y + s * 0.05);
        g.quadraticCurveTo(x + s * 0.7, y + s * 0.7, x, y + s);
        g.quadraticCurveTo(x - s * 0.7, y + s * 0.7, x - s * 0.75, y + s * 0.05);
        g.closePath(); g.fill(); g.stroke();
        g.beginPath();
        for (let i = 0; i < steps; i++) {
          const cy = y - s * 0.25 + i * s * 0.3;
          g.moveTo(x - s * 0.4, cy); g.lineTo(x, cy + s * 0.22); g.lineTo(x + s * 0.4, cy);
        }
        g.stroke();
      }
      g.restore();
    }
  };
})();
