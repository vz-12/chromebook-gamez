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
               me, them   { name, pilot, pilotName, col, awake }
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
                   pilotName, col (the pilot's colour, '#rrggbb'), awake }
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

      // who is fighting: each player and their pilot, facing each other
      if (d.me && d.them) {
        const vy = Math.max(48, cy - ch / 2 - 120), off = Math.min(250, w * 0.3);
        const side = (p, x, dir) => {
          g.save(); g.translate(x - dir * 34, vy); g.rotate(dir < 0 ? Math.PI : 0); g.scale(1.3, 1.3);
          d.hull(p.pilot); g.fillStyle = p.col; g.fill(); g.restore();
          g.textAlign = dir > 0 ? 'left' : 'right';
          g.fillStyle = '#e2e8f0'; g.font = "700 15px 'JetBrains Mono', monospace";
          g.fillText(p.name, x, vy - 8);
          g.fillStyle = p.col; g.font = "600 10px 'Chakra Petch', Barlow, sans-serif";
          g.fillText(p.pilotName + (p.awake ? '  ·  AWAKE' : ''), x, vy + 10);
        };
        side(d.me, cx - off, 1);
        side(d.them, cx + off, -1);
        g.textAlign = 'center';
        g.fillStyle = '#f472b6'; g.font = "800 18px 'Chakra Petch', Barlow, sans-serif";
        g.fillText('VS', cx, vy - 6);
        g.fillStyle = '#64748b'; g.font = "600 10px 'Chakra Petch', Barlow, sans-serif";
        g.fillText((d.league ? d.league.n + '  ·  ' : d.queue === 'casual' ? 'CASUAL  ·  ' : '') + 'BEST OF ' + d.bestOf, cx, vy + 14);
      }

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
    },

    /* A first pass: the outcome, the two pilots either side of the score,
       a pill per round, the numbers, and the referee's word. */
    result(g, w, h, t, r) {
      const COL = { won: '#86efac', lost: '#f87171', left: '#67e8f9', void: '#94a3b8' }[r.outcome] || '#94a3b8';
      const TITLE = { won: 'VICTORY', lost: 'DEFEAT', left: 'OPPONENT LEFT', void: 'NO CONTEST' }[r.outcome] || '';
      const cx = w / 2, top = Math.max(40, h * 0.12), k = ease(t / 0.7);
      const glow = g.createRadialGradient(cx, top + 40, 10, cx, top + 40, Math.max(w, h) * 0.6);
      glow.addColorStop(0, COL + '22'); glow.addColorStop(1, 'rgba(5,6,10,0)');
      g.fillStyle = glow; g.fillRect(0, 0, w, h);
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.globalAlpha = k;
      g.fillStyle = COL;
      g.font = "800 " + Math.round(Math.min(64, w * 0.09)) + "px 'Chakra Petch', Barlow, sans-serif";
      g.fillText(TITLE, cx, top + 30 * (1 - k) + 20);

      // the pilots, either side of the score
      const y = top + 150;
      const side = (p, x, dir, mine) => {
        g.save();
        g.translate(x, y);
        g.rotate(dir < 0 ? Math.PI : 0);
        g.scale(2.2, 2.2);
        r.hull(p.pilot);
        g.fillStyle = p.col + (mine ? 'ee' : '99'); g.fill();
        g.restore();
        g.fillStyle = '#e2e8f0';
        g.font = "700 15px 'JetBrains Mono', monospace";
        g.fillText(p.name, x, y + 62);
        g.fillStyle = p.col;
        g.font = "600 10px 'Chakra Petch', Barlow, sans-serif";
        g.fillText(p.pilotName + (p.awake ? ' · AWAKE' : ''), x, y + 80);
      };
      const off = Math.min(260, w * 0.3);
      side(r.me, cx - off, 1, true);
      side(r.them, cx + off, -1, false);
      g.fillStyle = '#e2e8f0';
      g.font = "800 48px 'JetBrains Mono', monospace";
      g.fillText(r.score[0] + ' — ' + r.score[1], cx, y);
      g.fillStyle = '#64748b';
      g.font = "600 11px 'Chakra Petch', Barlow, sans-serif";
      g.fillText('BEST OF ' + r.bestOf, cx, y + 36);

      // a pill per round, in order
      const pw = 34, gap = 8, n = r.rounds.length, x0 = cx - (n * pw + (n - 1) * gap) / 2, py = y + 120;
      r.rounds.forEach((rd, i) => {
        const a = ease((t - 0.4 - i * 0.12) / 0.4);
        rr(g, x0 + i * (pw + gap), py - 7, pw, 14, 7);
        g.fillStyle = (rd.won ? '#86efac' : '#f87171') + (a > 0 ? Math.round(40 + 160 * a).toString(16).padStart(2, '0') : '00');
        g.fill();
      });

      // the numbers
      g.globalAlpha = k;
      g.fillStyle = '#94a3b8';
      g.font = "600 12px 'JetBrains Mono', monospace";
      const clock = Math.floor(r.time / 60) + ':' + String(Math.floor(r.time % 60)).padStart(2, '0');
      g.fillText(r.dealt[0].toLocaleString('en-US') + ' DEALT  ·  ' + r.dealt[1].toLocaleString('en-US') + ' TAKEN  ·  ' + clock +
                 (r.map ? '  ·  ' + r.map.name + ' ' + (r.infested ? 'INFESTED' : 'CLEAN') : ''), cx, py + 34);

      // the referee, and in ranked the rating
      let word = r.verdict ? (r.verdict.v === 'void' ? 'NO CONTEST: THE TWO GAMES DISAGREED' : 'RECORDED')
        : 'TELLING THE REFEREE' + '...'.slice(0, 1 + Math.floor(t * 2) % 3);
      if (r.rating) {
        const d = r.rating.after - r.rating.before;
        word = (r.rating.league ? r.rating.league.toUpperCase() + '  ·  ' : 'PLACEMENT ' + r.rating.games + ' OF ' + (r.rating.games + r.rating.left) + '  ·  ')
          + r.rating.after + '  (' + (d >= 0 ? '+' : '') + d + ')';
      }
      g.fillStyle = r.verdict && r.verdict.v === 'void' ? '#f87171' : '#cbd5e1';
      g.font = "700 13px 'Chakra Petch', Barlow, sans-serif";
      g.fillText(word, cx, py + 64);
      g.globalAlpha = 1;
    }
  };
})();
