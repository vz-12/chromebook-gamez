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

   The background is already painted (the game's own dark). A throw is
   logged once and leaves the screen blank; the match carries on regardless.
   What is below is a first pass, to be drawn over.
   ========================================================================= */
(() => {
  'use strict';
  const ease = x => 1 - Math.pow(1 - Math.max(0, Math.min(1, x)), 5);   // outQuint
  const rr = (g, x, y, w, h, r) => {
    g.beginPath();
    g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r);
    g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
  };
  const SPIN = 2.8, LAND = 3.0, REEL = 1.3;

  function card(g, s, x, y, cw, ch, lit) {
    g.save();
    rr(g, x, y, cw, ch, 12);
    g.fillStyle = s.bg; g.fill();
    g.clip();
    g.strokeStyle = s.grid; g.lineWidth = 1;
    for (let gx = x + 12; gx < x + cw; gx += 22) { g.beginPath(); g.moveTo(gx, y); g.lineTo(gx, y + ch); g.stroke(); }
    for (let gy = y + 12; gy < y + ch; gy += 22) { g.beginPath(); g.moveTo(x, gy); g.lineTo(x + cw, gy); g.stroke(); }
    g.restore();
    rr(g, x, y, cw, ch, 12);
    g.strokeStyle = s.accent; g.globalAlpha = lit ? 1 : 0.45; g.lineWidth = lit ? 2.5 : 1.2; g.stroke();
    g.globalAlpha = 1;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = s.accent;
    g.font = "700 20px 'Chakra Petch', Barlow, sans-serif";
    g.fillText(s.name, x + cw / 2, y + ch / 2 - 6);
    g.fillStyle = 'rgba(203,213,225,0.7)';
    g.font = "600 11px 'JetBrains Mono', monospace";
    g.fillText(String(s.tag || '').toUpperCase(), x + cw / 2, y + ch / 2 + 18);
  }

  window.PVP_ART = {
    belt(g, w, h, t, d) {
      const n = d.maps.length, cw = Math.min(240, w * 0.28), ch = 132, gap = 20, step = cw + gap;
      const cy = h * 0.42, cx = w / 2;
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#64748b';
      g.font = "700 12px 'Chakra Petch', Barlow, sans-serif";
      g.fillText('THE ARENA', cx, cy - ch / 2 - 40);

      // the belt: a long run of the list, easing to a stop with the drawn one in the middle
      const laps = 4, target = (laps * n + d.pick) * step;
      const pos = target * ease(t / SPIN);
      const first = Math.floor((pos - cx) / step) - 1, last = Math.ceil((pos + cx) / step) + 1;
      for (let i = first; i <= last; i++) {
        const s = d.maps[((i % n) + n) % n];
        const x = cx + i * step - pos - cw / 2;
        const lit = t > SPIN && i === laps * n + d.pick;
        const fade = 1 - Math.min(1, Math.abs(x + cw / 2 - cx) / (w * 0.55));
        g.globalAlpha = Math.max(0.12, fade);
        card(g, s, x, cy - ch / 2, cw, ch, lit);
      }
      g.globalAlpha = 1;
      // the window it lands in
      const picked = d.maps[d.pick];
      g.strokeStyle = t > SPIN ? picked.accent : 'rgba(226,232,240,0.5)';
      g.lineWidth = 2;
      const bx = cx - cw / 2 - 10, by = cy - ch / 2 - 10, bw = cw + 20, bh = ch + 20, k = 16;
      for (const [x0, y0, sx, sy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
        g.beginPath(); g.moveTo(x0 + sx * k, y0); g.lineTo(x0, y0); g.lineTo(x0, y0 + sy * k); g.stroke();
      }

      // the variation: a marker flicks between the two and lands
      if (t < LAND) return;
      const u = (t - LAND) / REEL, y = cy + ch / 2 + 64;
      const labels = [['CLEAN', '#67e8f9', 1 - d.odds], ['INFESTED', '#f87171', d.odds]];
      const flicks = 7, at = ease(u) * flicks;
      const on = u >= 1 ? (d.infested ? 1 : 0) : (Math.floor(at) + (d.infested ? 1 : 0)) % 2;
      labels.forEach(([txt, col, p], i) => {
        const x = cx + (i ? 1 : -1) * 110, active = on === i, done = u >= 1 && active;
        rr(g, x - 92, y - 24, 184, 48, 24);
        g.fillStyle = active ? col + (done ? '33' : '22') : 'rgba(8,13,22,0.8)'; g.fill();
        g.strokeStyle = active ? col : 'rgba(100,116,139,0.5)'; g.lineWidth = done ? 2.5 : 1.2; g.stroke();
        g.fillStyle = active ? col : '#64748b';
        g.font = "800 16px 'Chakra Petch', Barlow, sans-serif";
        g.fillText(txt, x, y - 3);
        g.font = "600 10px 'JetBrains Mono', monospace";
        g.fillText(Math.round(p * 100) + '%', x, y + 13);
      });
      if (u >= 1) {
        g.fillStyle = '#94a3b8';
        g.font = "600 13px Barlow, sans-serif";
        const why = d.hackers >= 2 ? 'Two HACKERS: the room is always full.'
          : d.hackers === 1 ? 'THE HACKER is in the fight: three in four rooms are infested.'
          : d.infested ? 'The room fights too.' : 'Just the two of you.';
        g.fillText(why, cx, y + 50);
      }
    }
  };
})();
