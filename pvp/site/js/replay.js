/* ===========================================================================
   VOIDRUNNER PvP — a replay, for the trailer (live spectating, step 4)

   /play/?replay=<file>: a broadcast's whole log (the relay's replay, from
   the lobby's REPLAYS card), played by watch.js's own player from its first
   step, with controls made for capturing it:

     Space        pause, play
     - / +        slower, faster: 1/4, 1/2, 1, 2, 4
     ← / →        back to the snapshot before, on to the one after; Home: the start
     1 / 2        the camera on the first fighter, on the second (Tab: the other one)
     3            both, framed together
     4            free: drag to move it, the wheel to zoom
     E            whose eyes: the other fighter's screen, as their own machine
                  drew it (their HUD and cards, and what only they were shown
                  of their own pilot); it starts on the hidden pilot's opponent's
     U            the game's HUD, off and on
     H            these controls and the tags, off and on, for a clean frame

   The frame is a fixed 16:9, drawn at 1920x1080 and letterboxed in the
   window: record it with OBS (window capture of this tab).

   A replay plays only on the build it was recorded on, since any change to
   the engine plays the same inputs differently: the log carries its build,
   and the page refuses any other (watch.js). Check out the commit the fight
   was played on (tag it on the day), run `npm run dev:pvp`, put the file in
   pvp/site/replays/ and open /play/?replay=<file> there. Without the file
   there, the page asks for it instead.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M || !M.hand || !M.hand.replay) return;
  const V = M.watch;

  const SPEEDS = [0.25, 0.5, 1, 2, 4];
  const FRAME = { w: 1280, h: 720, dpr: 1.5 };        // 16:9, drawn at 1920x1080
  const R = M.replay = { speed: 2, mode: 'pilot', free: null, bare: false, ui: true, drag: null };

  /* -------------------------------- the frame ----------------------------- */
  M.frameSize = () => FRAME;
  // the canvas, letterboxed in the window at 16:9
  function fit() {
    const k = Math.min(innerWidth / FRAME.w, innerHeight / FRAME.h);
    const w = Math.floor(FRAME.w * k), h = Math.floor(FRAME.h * k);
    Object.assign(cv.style, { position: 'fixed', width: w + 'px', height: h + 'px',
                              left: Math.floor((innerWidth - w) / 2) + 'px', top: Math.floor((innerHeight - h) / 2) + 'px' });
  }
  M.bare = () => R.bare;

  /* -------------------------------- the camera ---------------------------- */
  // what the camera follows, and how close: a pilot (watch.js's own), both, or anywhere
  const cam0 = M.cam;
  M.cam = () => {
    if (R.mode === 'pilot' || V.phase === 'wait' || V.phase === 'off') return cam0();
    if (R.mode === 'both') {
      const a = pilotP(0), b = pilotP(1);
      if (!a || !b) return cam0();
      return { x: (a.x + b.x) / 2 - 60, y: (a.y + b.y) / 2, ang: 0, down: false };   // (the camera looks 60 ahead of its subject)
    }
    return R.free ? { x: R.free.x - 60, y: R.free.y, ang: 0, down: false } : cam0();
  };
  M.zoom = z => {
    if (R.mode === 'both') {
      const a = pilotP(0), b = pilotP(1);
      if (!a || !b) return z;
      const span = Math.max(Math.abs(a.x - b.x) / (FRAME.w * 0.7), Math.abs(a.y - b.y) / (FRAME.h * 0.7));
      return clamp(1 / Math.max(span, 1e-3), 0.45, 1.2);
    }
    if (R.mode === 'free' && R.free) return R.free.zoom;
    return z;
  };
  function mode(m) {
    R.mode = m;
    if (m === 'free' && !R.free) R.free = { x: cam.x, y: cam.y, zoom: camZoom };
    say();
  }

  /* ------------------------------- the controls --------------------------- */
  function key(e) {
    const k = e.key;
    if (k === ' ') V.paused = !V.paused;
    else if (k === '-' || k === '_') R.speed = Math.max(0, R.speed - 1);
    else if (k === '+' || k === '=') R.speed = Math.min(SPEEDS.length - 1, R.speed + 1);
    else if (k === 'ArrowLeft') seekBy(-1);
    else if (k === 'ArrowRight') seekBy(1);
    else if (k === 'Home') V.seek(-1);
    else if (k === '1' || k === '2') { V.cam = +k - 1; mode('pilot'); }
    else if (k === '3') mode('both');
    else if (k === '4') mode('free');
    else if (k === 'e' || k === 'E') V.look(1 - V.eyes);
    else if (k === 'u' || k === 'U') R.bare = !R.bare;
    else if (k === 'h' || k === 'H') { R.ui = !R.ui; say(); }
    else return;
    V.speed = SPEEDS[R.speed];
    say();
  }
  // the snapshot before where the replay is (more than a second back, so a press goes somewhere), or the one after
  function seekBy(d) {
    const S = V.file ? V.file.snaps : [];
    if (d < 0) {
      let k = -1;
      S.forEach((s, i) => { if (s.at < LS.tick - 60) k = i; });
      V.seek(k);
    } else {
      const k = S.findIndex(s => s.at > LS.tick);
      if (k >= 0) V.seek(k);
    }
  }
  // the scrub bar: a click goes to the last snapshot before that point
  function scrub(x, w) {
    const S = V.file ? V.file.snaps : [], at = (x / w) * (V.file ? V.file.last + 1 : 1);
    let k = -1;
    S.forEach((s, i) => { if (s.at <= at) k = i; });
    V.seek(k);
  }

  const CSS = `
#pvp-replay{position:fixed;left:12px;right:12px;bottom:12px;z-index:11;padding:10px 12px;border-radius:9px;
  background:rgba(8,13,22,.86);border:1px solid rgba(148,163,184,.3);font:600 11px 'JetBrains Mono',ui-monospace,monospace;color:#94a3b8}
#pvp-replay[hidden]{display:none}
#pvp-replay .track{position:relative;height:14px;border-radius:7px;background:rgba(30,41,59,.9);cursor:pointer}
#pvp-replay .fill{position:absolute;left:0;top:0;bottom:0;border-radius:7px;background:rgba(244,114,182,.45)}
#pvp-replay .snap{position:absolute;top:2px;bottom:2px;width:2px;background:#e2e8f0;opacity:.6}
#pvp-replay .row{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:8px;align-items:center}
#pvp-replay b{color:#e2e8f0}
#pvp-replay .keys{color:#64748b}`;
  let bar = null;
  function build() {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    bar = document.createElement('div');
    bar.id = 'pvp-replay';
    bar.setAttribute('data-pvp-ui', '');
    bar.innerHTML = '<div class="track"><div class="fill"></div></div><div class="row"><b class="t"></b><span class="s"></span>' +
                    '<span class="c"></span><span class="e"></span><span class="keys">SPACE pause · −/+ speed · ←/→ snapshots · 1 2 3 4 camera · E eyes · U HUD · H hide</span></div>';
    const track = bar.querySelector('.track');
    track.addEventListener('click', e => { const r = track.getBoundingClientRect(); scrub(e.clientX - r.left, r.width); });
    document.body.appendChild(bar);
  }
  const mmss = s => Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0');
  let marks = -1;
  function say() {
    if (!bar) return;
    bar.hidden = !R.ui;
    const live = document.getElementById('pvp-watch');
    if (live) live.style.display = R.ui ? '' : 'none';
    if (!V.file) return;
    const last = V.file.last + 1;
    bar.querySelector('.fill').style.width = (100 * Math.min(1, LS.tick / last)).toFixed(2) + '%';
    if (marks !== V.file.snaps.length) {
      marks = V.file.snaps.length;
      const track = bar.querySelector('.track');
      for (const s of V.file.snaps) {
        const m = document.createElement('div');
        m.className = 'snap';
        m.style.left = (100 * s.at / last).toFixed(2) + '%';
        track.appendChild(m);
      }
    }
    bar.querySelector('.t').textContent = mmss(LS.tick / 60) + ' / ' + mmss(last / 60);
    bar.querySelector('.s').textContent = (V.paused ? 'PAUSED' : 'PLAYING') + '  ·  ' + SPEEDS[R.speed] + '×';
    bar.querySelector('.c').textContent = 'CAMERA: ' + (R.mode === 'pilot' ? V.names[V.cam] || '' : R.mode === 'both' ? 'BOTH' : 'FREE');
    bar.querySelector('.e').textContent = 'EYES: ' + (V.names[V.eyes] || '');
  }

  /* The free camera: dragged to move it, the wheel to zoom, in the frame's
     own units. Heard through watch.js, which keeps every press from the game. */
  function pointer(e) {
    if (e.type === 'mousedown') R.drag = e.target === cv;
    else if (e.type === 'mouseup') R.drag = false;
    if (R.mode !== 'free' || !R.free) return;
    if (e.type === 'mousemove' && R.drag) {
      const k = FRAME.w / (parseFloat(cv.style.width) || FRAME.w);
      R.free.x -= e.movementX * k / R.free.zoom;
      R.free.y -= e.movementY * k / R.free.zoom;
    } else if (e.type === 'wheel') R.free.zoom = clamp(R.free.zoom * Math.exp(-e.deltaY * 0.0012), 0.3, 2.5);
  }

  const start = M.modes.watch.start, frame = M.modes.watch.frame;
  M.modes.watch.start = () => {
    start();
    fit();
    resize();                             // the engine's own: the frame's fixed size (frameSize, above)
    addEventListener('resize', fit);
    build();
    V.onKey = key;
    V.onPointer = pointer;
    V.speed = SPEEDS[R.speed];
    say();
  };
  M.modes.watch.frame = () => { frame(); say(); };
})();
