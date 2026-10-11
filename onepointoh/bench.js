/* ===========================================================================
   ONE POINT OH — THE ART BENCH (?opo=bench)

   Every part of the art kit (OPO_KIT, "ONE POINT OH — the art kit" in
   index.html), played on its own, to try things on before they go in a hook.
   Each demo below is short on purpose: it is also the example of how to use
   the part it shows. Open the game with ?opo=bench on your own server (npm run
   dev) or signed in to a dev account. It never touches the save.

     ← →   demo            SPACE  again          P  pause      .  one frame
     ↑ ↓   speed           W      wireframes     L  lit / flat (the old renderer)
     T     the first build, live (its frame mounted behind; else the stand-in)
     G     clear the glass      click  strike where you click (most demos)
     ESC   back to the menu

   The picture that breaks is today's menu, drawn and captured
   (OPO_KIT.capture), and the picture under it is the first build
   (OPO_KIT.first()).
   ========================================================================= */
(function () {
  'use strict';
  const K = OPO_KIT;
  const B = { i: 0, demo: null, paused: false, speed: 1, flat: false, live: null, liveEl: null, step1: false, fps: 60, t: 0 };

  // today's screen, as the game draws its menu: the picture that breaks
  function backdrop(g) {
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
    g.fillStyle = COL.bg; g.fillRect(0, 0, W, H);
    try { renderMenu(); } catch (e) { g.fillStyle = '#e0f2fe'; g.font = '800 64px sans-serif'; g.textAlign = 'center'; g.fillText('VOIDRUNNER', W / 2, H / 2); }
    g.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  // the first build: live from its frame when mounted (T), else the kit's stand-in
  const first = () => (B.live && B.live.width ? B.live : K.first());
  const drawFirst = (g, a) => { g.save(); g.globalAlpha = a === undefined ? 1 : a; g.drawImage(first(), 0, 0, W, H); g.restore(); };
  const lit = () => !B.flat;

  /* ------------------------------- the demos ------------------------------ */
  const DEMOS = [
    { n: 'DEBRIS AT THE GLASS', d: 'Chunks thrown up off the screen at you: they grow, tumble, strike the glass and crack it, then fall back or cling and slide. sim + body (thick) + glass.',
      make() {
        const S = K.screen(W, H);
        const sim = K.sim({ space: S, gravity: K.V(0, 900, -1500) });
        let spawn = 0;
        const throwOne = (x, y) => {
          const r = 10 + rnd() * 22, n = 3 + ((rnd() * 4) | 0), shape = [];
          for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2 + rnd() * 0.5; shape.push(K.V(Math.cos(a) * r * (0.7 + rnd() * 0.5), Math.sin(a) * r * (0.7 + rnd() * 0.5))); }
          sim.add(K.body({ shape, thick: 4 + rnd() * 8, x, y, z: 0, vx: (rnd() - 0.5) * 300, vy: -200 - rnd() * 200, vz: 1300 + rnd() * 700,
            wx: (rnd() - 0.5) * 9, wy: (rnd() - 0.5) * 9, wz: (rnd() - 0.5) * 6, flat: !lit(),
            col: pick(['#1d3557', '#0e1626', '#67e8f9', '#f472b6', '#334155']), edgeCol: '#0b1220',
            glass: rnd() < 0.3 ? 'stick' : 'crack', life: 4, fade: 0.6 }));
        };
        return {
          click: (x, y) => { for (let i = 0; i < 6; i++) throwOne(x, y); },
          step(dt) { spawn -= dt; if (spawn <= 0) { spawn = 0.28; throwOne(W / 2 + (rnd() - 0.5) * W * 0.5, H * 0.62 + (rnd() - 0.5) * 80); } sim.step(dt); },
          draw(g) { backdrop(g); sim.draw(g, { light: lit() }); K.glass.draw(g, W, H, { frame: K.capture('bench') }); },
          stat: () => sim.bodies.length + ' bodies · ' + K.glass.hits.length + ' cracks'
        };
      } },

    { n: 'THE SCREEN SHATTERS', d: 'Today\'s screen captured, broken radially from a point, and the pieces thrown: some at you (to the glass), most falling away down into the first build underneath. capture + radial + bodiesOf.',
      make() {
        const S = K.screen(W, H);
        let sim = null, t = 0, at = { x: W * 0.55, y: H * 0.4 };
        const breakAt = (x, y) => {
          at = { x, y };
          backdrop(ctx);
          const cap = K.capture('shatter');
          const shards = K.radial(K.rect(0, 0, W, H, cap.sx), at, { spokes: 14, rings: 6, seed: 3 });
          sim = K.sim({ space: S, gravity: K.V(0, 950, -380) });
          for (const b of K.bodiesOf(shards, { img: cap.img, from: at, power: 1, flat: !lit(), backCol: '#05060a', edgeCol: '#cbd5e1', glass: 'crack', life: 5, fade: 0.8,
                                                kick: (s, i) => { const dx = s.c.x - at.x, dy = s.c.y - at.y, d = Math.hypot(dx, dy) || 1, near = Math.exp(-d / 220);
                                                                  return { vx: dx / d * 260 * near, vy: dy / d * 200 * near - 80, vz: rnd() < near * 0.25 ? 900 + rnd() * 600 : -150 - rnd() * 300,
                                                                           wx: (rnd() - 0.5) * 4, wy: (rnd() - 0.5) * 4, wz: (rnd() - 0.5) * 2 }; } })) sim.add(b);
          K.glass.hit(x, y, 1.6);
          t = 0;
        };
        return {
          click: breakAt,
          step(dt) { if (!sim) breakAt(at.x, at.y); t += dt; sim.step(dt); },
          draw(g) { g.setTransform(DPR, 0, 0, DPR, 0, 0); drawFirst(g); if (sim) sim.draw(g, { light: lit() }); K.glass.draw(g, W, H); },
          stat: () => (sim ? sim.bodies.length : 0) + ' pieces'
        };
      } },

    { n: 'FOLD IN ON ITSELF', d: 'Today\'s screen as one sheet: folded in thirds, folded down, crumpled into a wad, then let go as bodies. Its back is the first build. sheet.fold + crumple + bodies.',
      make() {
        const S = K.screen(W, H);
        let cap = null, sh = null, t = 0, sim = null;
        const T = { a: 1.1, b: 2.2, c: 3.3, d: 4.8, drop: 5.6 };
        return {
          click() { t = 0; sim = null; },
          step(dt) {
            if (!cap) { backdrop(ctx); cap = K.capture('fold'); sh = K.sheet({ x: 0, y: 0, w: W, h: H, img: cap.img, uvScale: cap.sx, back: first() }); }
            t += dt;
            if (sim) { sim.step(dt); return; }
            const e = x => K.ease.inOut(K.c01(x));
            sh.pose();
            sh.fold(W / 3, 0, W / 3, H, Math.PI * e(t / T.a), { move: { x: 0, y: H / 2 } });            // the left third over
            sh.fold(W * 2 / 3, 0, W * 2 / 3, H, Math.PI * e((t - T.a) / (T.b - T.a)), { move: { x: W, y: H / 2 } }); // and the right
            sh.fold(0, H / 2, W, H / 2, Math.PI * e((t - T.b) / (T.c - T.b)), { move: { x: W / 2, y: 0 } }); // the top half down
            sh.crumple(e((t - T.c) / (T.d - T.c)), { seed: 5, folds: 6 });                            // in on itself
            if (t > T.drop) {
              sim = K.sim({ space: S, gravity: K.V(0, 1400, -900) });
              for (const b of sh.bodies({ flat: !lit(), backCol: '#05060a', life: 3, fade: 0.6 })) { b.v = K.V((rnd() - 0.5) * 200, -150, 300); b.w = K.V((rnd() - 0.5) * 6, (rnd() - 0.5) * 6, (rnd() - 0.5) * 3); sim.add(b); }
            }
          },
          draw(g) {
            g.setTransform(DPR, 0, 0, DPR, 0, 0);
            g.fillStyle = '#020306'; g.fillRect(0, 0, W, H);
            drawFirst(g, 0.25);
            if (sim) sim.draw(g, { light: lit() }); else if (sh) sh.draw(g, S, { flat: !lit(), backCol: '#05060a' });
          },
          stat: () => sim ? sim.bodies.length + ' pieces falling' : (sh ? sh.polys.length + ' faces' : '')
        };
      } },

    { n: 'THE OLD RENDER PEELS BACK', d: 'Today\'s screen rolling up from a corner like a carpet, the roll moving across it, the first build underneath and on its back. sheet.curl with roll: true (it slices itself into strips for the roundness).',
      make() {
        const S = K.screen(W, H);
        let cap = null, t = 0;
        return {
          click() { t = 0; },
          step(dt) { if (!cap) { backdrop(ctx); cap = K.capture('peel'); } t += dt; if (t > 5) t = 0; },
          draw(g) {
            g.setTransform(DPR, 0, 0, DPR, 0, 0);
            drawFirst(g);
            const sh = K.sheet({ x: 0, y: 0, w: W, h: H, img: cap.img, uvScale: cap.sx, back: first() });
            // a roll square to the diagonal, moving in from the bottom right corner toward the top left
            const k = K.ease.inOut(K.c01(t / 4)), D = Math.hypot(W, H), dx = -W / D, dy = -H / D;
            const px = W + dx * D * 1.15 * k, py = H + dy * D * 1.15 * k, tx = -dy, ty = dx;
            sh.curl(px - tx * 4000, py - ty * 4000, px + tx * 4000, py + ty * 4000, 46, { side: -1, roll: true, n: 20 });   // side -1: the corner's side
            sh.draw(g, S, { flat: !lit() });
          },
          stat: () => ''
        };
      } },

    { n: 'PANES FALL INTO THE ROOM', d: 'Cards of the first build, live, dropped from high over the floor: they tumble down, land, bounce and settle, with shadows growing sharper as they fall. body (textured) + floor plane + shadows.',
      make() {
        const S = K.screen(W, H);
        const sim = K.sim({ space: S, gravity: K.V(0, 0, -1800) }).floor(0, { bounce: 0.3, friction: 0.6 });
        let spawn = 0;
        const drop = (x, y) => {
          const w = 70 + rnd() * 50, h = w * 0.62, img = first(), iw = img.width, ih = img.height;
          sim.add(K.body({ shape: [K.V(-w / 2, -h / 2), K.V(w / 2, -h / 2), K.V(w / 2, h / 2), K.V(-w / 2, h / 2)],
            uv: [{ u: 0, v: 0 }, { u: iw, v: 0 }, { u: iw, v: ih }, { u: 0, v: ih }], img, backCol: '#1d3557', edgeCol: '#0b1220', thick: 3,
            x, y, z: 420 + rnd() * 200, vx: (rnd() - 0.5) * 160, vy: (rnd() - 0.5) * 160, vz: -100,
            wx: (rnd() - 0.5) * 7, wy: (rnd() - 0.5) * 7, wz: (rnd() - 0.5) * 3, flat: !lit(), life: 7, fade: 0.8, bounce: 0.35 }));
        };
        return {
          click: drop,
          step(dt) { spawn -= dt; if (spawn <= 0) { spawn = 0.7; drop(W * (0.25 + rnd() * 0.5), H * (0.3 + rnd() * 0.45)); } sim.step(dt); },
          draw(g) { backdrop(g); g.fillStyle = 'rgba(2,3,6,0.55)'; g.fillRect(0, 0, W, H); sim.draw(g, { light: lit() }); },
          stat: () => sim.bodies.length + ' panes, ' + sim.bodies.filter(b => b.sleeping).length + ' at rest'
        };
      } },

    { n: 'RUBBLE', d: 'A panel of the screen broken into Voronoi chunks with thickness, popping up off the floor and coming down in a heap. voronoi + bodiesOf + floor.',
      make() {
        const S = K.screen(W, H);
        let sim = null;
        const blow = (x, y) => {
          backdrop(ctx);
          const cap = K.capture('rubble');
          const w = Math.min(520, W * 0.5), h = w * 0.6, px = x - w / 2, py = y - h / 2;
          const shards = K.voronoi(K.rect(px, py, w, h, cap.sx), 26, 9, { near: { x, y }, spread: 140 });
          sim = K.sim({ space: S, gravity: K.V(0, 0, -1700) }).floor(0, { bounce: 0.25, friction: 0.7 });
          for (const b of K.bodiesOf(shards, { img: cap.img, thick: 10, edgeCol: '#16243c', backCol: '#0e1626', from: { x, y }, power: 0.9, flat: !lit(), life: 8, fade: 1,
                                                kick: s => ({ vx: (s.c.x - x) * 1.6, vy: (s.c.y - y) * 1.6, vz: 500 + rnd() * 500, wx: (rnd() - 0.5) * 10, wy: (rnd() - 0.5) * 10, wz: (rnd() - 0.5) * 4 }) })) sim.add(b);
          sim.hole = { x: px, y: py, w, h };
        };
        return {
          click: blow,
          step(dt) { if (!sim) blow(W / 2, H / 2); sim.step(dt); },
          draw(g) {
            backdrop(g);
            if (sim && sim.hole) { g.fillStyle = '#020306'; g.fillRect(sim.hole.x, sim.hole.y, sim.hole.w, sim.hole.h); }
            if (sim) sim.draw(g, { light: lit() });
          },
          stat: () => (sim ? sim.bodies.length : 0) + ' chunks'
        };
      } },

    { n: 'THE GLASS', d: 'The screen\'s own glass: strikes crack it in spokes and rings that refract what is behind them, and fade. Click to strike harder where you click. glass.hit + glass.draw (or draw glass.hits your own way).',
      make() {
        let every = 0;
        return {
          click: (x, y) => K.glass.hit(x, y, 1.8),
          step(dt) { every -= dt; if (every <= 0) { every = 0.9; K.glass.hit(W * (0.15 + rnd() * 0.7), H * (0.15 + rnd() * 0.7), 0.3 + rnd() * 1.2); } },
          draw(g) { backdrop(g); K.glass.draw(g, W, H, { frame: K.capture('glass') }); },
          stat: () => K.glass.hits.length + ' cracks'
        };
      } },

    { n: 'A PANE TURNS', d: 'One textured slab of the first build turning in place, steeply, near and far: the perspective subdivision keeps it from swimming. W shows its triangles. polyTex.',
      make() {
        const S = K.screen(W, H);
        let t = 0;
        return {
          step(dt) { t += dt; },
          draw(g) {
            g.setTransform(DPR, 0, 0, DPR, 0, 0);
            g.fillStyle = '#05060a'; g.fillRect(0, 0, W, H);
            const img = first(), w = Math.min(W, H) * 0.7, h = w * 0.5625;
            const b = K.body({ shape: [K.V(-w / 2, -h / 2), K.V(w / 2, -h / 2), K.V(w / 2, h / 2), K.V(-w / 2, h / 2)],
              uv: [{ u: 0, v: 0 }, { u: img.width, v: 0 }, { u: img.width, v: img.height }, { u: 0, v: img.height }], img, thick: 8,
              backCol: '#1d3557', edgeCol: '#0e1626', x: W / 2, y: H / 2, z: 120 + Math.sin(t * 0.7) * 160, flat: !lit() });
            b.q = K.qMul(K.qAxis(K.V(0, 1, 0), t * 0.9), K.qAxis(K.V(1, 0, 0), Math.sin(t * 0.6) * 0.9));
            K.drawBodies(g, S, [b], { light: lit() });
          },
          stat: () => ''
        };
      } }
  ];

  /* ------------------------------- the bench ------------------------------ */
  function start(i) {
    B.i = (i + DEMOS.length) % DEMOS.length;
    K.glass.clear();
    B.demo = DEMOS[B.i].make();
    B.t = 0;
  }
  function mountLive(on) {
    if (!on) { if (B.liveEl) B.liveEl.remove(); B.liveEl = null; B.live = null; return; }
    try {
      const f = document.createElement('iframe');
      f.src = 'onepointoh/first.html';
      Object.assign(f.style, { position: 'fixed', left: '0', top: '0', width: '100vw', height: '100vh', border: '0', zIndex: '-1', pointerEvents: 'none' });
      f.addEventListener('load', () => { try { const c = f.contentWindow.OPO_COPY; if (c) { B.live = c.canvas; f.contentWindow.handleKey(' '); } } catch (e) {} });
      document.body.appendChild(f);
      B.liveEl = f;
    } catch (e) {}
  }
  const OPO_BENCH = {
    demos: DEMOS,
    open() { state = 'opobench'; uiArm = 0; start(0); },
    close() { mountLive(false); K.glass.clear(); K.debug = false; B.demo = null; state = 'menu'; uiArm = 0.3; },
    update(dt) {
      B.fps += ((dt > 0 ? 1 / dt : 60) - B.fps) * 0.05;
      if (!B.demo) return;
      if (B.paused && !B.step1) return;
      B.step1 = false;
      const d = Math.min(1 / 30, dt) * B.speed;
      B.t += d;
      B.demo.step(d);
    },
    draw() {
      if (!B.demo) return;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      ctx.save();
      try { B.demo.draw(ctx); } catch (e) { console.warn('bench: ' + DEMOS[B.i].n, e); }
      ctx.restore();
      // the bench's own words
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
      const D = DEMOS[B.i];
      ctx.fillStyle = 'rgba(2,4,8,0.78)'; ctx.fillRect(0, 0, W, 54); ctx.fillRect(0, H - 26, W, 26);
      ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
      ctx.font = "700 13px 'JetBrains Mono', ui-monospace, monospace"; ctx.fillStyle = '#facc15';
      ctx.fillText('OPO ART BENCH  ' + (B.i + 1) + '/' + DEMOS.length + '  ·  ' + D.n, 14, 16);
      ctx.font = "500 11px Barlow, 'Segoe UI', system-ui, sans-serif"; ctx.fillStyle = '#cbd5e1';
      ctx.fillText(D.d, 14, 37);
      ctx.font = "600 10px 'JetBrains Mono', ui-monospace, monospace"; ctx.fillStyle = '#94a3b8';
      ctx.fillText('← → demo · SPACE again · P pause · . frame · ↑ ↓ speed ' + B.speed + '× · W wire ' + (K.debug ? 'on' : 'off') + ' · L ' + (B.flat ? 'flat' : 'lit') +
                   ' · T first build ' + (B.live ? 'live' : 'stand-in') + ' · G glass · click strike · ESC out', 14, H - 13);
      ctx.textAlign = 'right';
      ctx.fillText((B.demo.stat ? B.demo.stat() : '') + '  ·  ' + Math.round(B.fps) + ' fps' + (B.paused ? '  ·  PAUSED' : ''), W - 14, 16);
    },
    key(k) {
      if (k === 'escape') { OPO_BENCH.close(); return; }
      if (k === 'arrowright') start(B.i + 1);
      else if (k === 'arrowleft') start(B.i - 1);
      else if (k === ' ') start(B.i);
      else if (k === 'p') B.paused = !B.paused;
      else if (k === '.') { B.paused = true; B.step1 = true; }
      else if (k === 'arrowup') B.speed = Math.min(2, B.speed * 2);
      else if (k === 'arrowdown') B.speed = Math.max(0.125, B.speed / 2);
      else if (k === 'w') K.debug = !K.debug;
      else if (k === 'l') { B.flat = !B.flat; start(B.i); }
      else if (k === 't') mountLive(!B.liveEl);
      else if (k === 'g') K.glass.clear();
    },
    click(x, y) { if (B.demo && B.demo.click) B.demo.click(x, y); }
  };
  window.OPO_BENCH = OPO_BENCH;
})();
