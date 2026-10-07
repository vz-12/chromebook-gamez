/* ===========================================================================
   VOIDRUNNER PvP — a match watched (live spectating, step 2)

   /play/?watch=<match>: no lobby, no account, nothing sent. The page asks the
   match's relay (pvp/src/broadcast.js, through /api/pvp/watch) for the fight
   and plays it on its own copy of the game: the run built from its header
   the way a guest's machine builds it (lsGuestStart), then step after step
   from both pilots' records through lockstep's own lsPlay, the engine's
   frame handing its steps here (PVP.steps). It stays about three seconds
   behind live (more when the relay asks its viewers to wait longer between
   polls), and plays a little faster when it falls further behind.

   Every second of the fight it holds its game's fingerprint up against the
   fighter's. One that differs, or a fighter's game put back in step (a newer
   epoch), and it takes the latest snapshot over (snapRead, as lockstep's
   resync does) and plays on from there; so it does when it has fallen far
   behind what it holds. A viewer arriving late starts from one too.

   What the viewer has: a camera on either fighter (Tab), a LIVE tag and a
   close button. It sees through the eyes of the side that is not the hidden
   pilot (MP.role): that player's HUD and cards, and of the hidden pilot only
   what its opponent sees, so the broadcast, a few seconds behind, never
   shows what the challenger could not. No key or click reaches the game.

   The same player plays a log already in hand (VR_PVP.watch.play(log): the
   relay's replay, whole), fed from it instead of from polls, from its start.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;
  const watching = () => !!(M.hand && M.hand.mode === 'watch');

  const SEE = M.SEE = {
    KEEP: 3,              // seconds behind live, at least
    KEEP_POLLS: 2.5,      // and at least this many of the relay's waits
    FAR: 20,              // seconds behind what it holds: the latest snapshot instead
    FAST: [1.25, 2],      // its speed a second further behind than that, and five seconds (a late viewer starts up to fifteen behind)
    STALL: 5000           // ms at the end with no more steps coming: over all the same
  };
  /* recs: step -> { host, wing }, the records not yet played; fps: step ->
     the fighter's fingerprint there; want: the first step not yet held (-1:
     a newcomer); last: the last step held. */
  const V = M.watch = { id: null, v: '', phase: 'wait', why: '', head: null, names: ['', ''], eyes: 0, cam: 0, primed: false,
                        recs: new Map(), fps: new Map(), want: -1, last: -1, end: null, every: 1000, next: 0, busy: false,
                        askSnap: false, askedAt: 0, lastSnap: null, adrift: false, acc: 0, checked: 0, parted: 0, adopted: 0,
                        took: [], file: null, idleSince: 0 };
  const viewerId = () => Array.from(crypto.getRandomValues(new Uint8Array(8)), b => b.toString(16).padStart(2, '0')).join('');
  const clean = v => (Array.isArray(v) ? v.filter(s => typeof s === 'string' && /^[\w-]{1,40}$/.test(s)).slice(0, 512) : []);

  /* ---------------------------- being a match ---------------------------- */
  /* What each side brings, as the match itself says, so this copy deals and
     counts as the fighters' do: a queued match's sides are the server's
     (cards.js reads them off the match record); a friend's, the handshakes'. */
  const served = () => !!(M.hand && M.hand.match && Array.isArray(M.hand.match.sides));
  const hello = k => (V.head && V.head.hellos[k]) || {};
  const upsOf = M.upsOf, bonusOf = M.bonusOf, nameOf = M.nameOf, pilotOpen = M.pilotOpen;
  M.upsOf = k => (watching() && !served() ? clean(hello(k).pvp && hello(k).pvp.ups) : upsOf(k));
  M.bonusOf = k => (!watching() ? bonusOf(k)
    : !served() && hello(k).pvp && hello(k).pvp.bonus === M.ROUNDS.adBonus ? M.ROUNDS.adBonus : 0);
  M.nameOf = k => (watching() ? V.names[k] || (k ? 'GUEST' : 'HOST') : nameOf(k));
  M.pilotOpen = id => watching() || pilotOpen(id);

  /* -------------------------------- the feed ------------------------------ */
  // the relay's answer; or, for a log in hand, the same answer made from it
  async function ask() {
    if (V.file) return { status: 200, d: fromFile() };
    try {
      const r = await fetch('/api/pvp/watch?match=' + V.id + '&from=' + V.want + '&v=' + V.v + (V.askSnap ? '&snap=1' : ''),
                            { cache: 'no-store' });
      return { status: r.status, d: await r.json().catch(() => null) };
    } catch (e) { return { status: 0, d: null }; }
  }
  /* A replay, answered as the relay would answer (broadcast.js, view): from
     its start, everything at once. Asked for a snapshot, it gives what a
     live viewer would have had by then: the first one from where this copy
     parted on (one taken when the fighters' own games were put back in
     step), never one already taken, and everything from there. Going back
     to an older one would only play the same steps to the same parting. */
  const snapKey = s => s.at + ':' + s.epoch;
  function fromFile() {
    const L = V.file, out = { ok: true, last: L.last, end: L.end, every: 0, from: 0 };
    if (!V.head) out.head = L.head;
    else if (V.askSnap) {
      const s = L.snaps.find(x => x.at >= LS.tick - LS_CHECK && snapKey(x) !== V.lastSnap);
      if (s) { out.snap = s; out.from = s.at; }
      else V.adrift = true;                              // none ahead: it plays on as it is, and stops asking
    }
    out.batches = L.batches.filter(b => b.from + b.n > out.from);
    return out;
  }

  async function poll() {
    V.busy = true;
    const { status, d } = await ask();
    V.busy = false;
    if (d && Number.isFinite(d.every)) V.every = Math.max(0, d.every);
    V.next = Date.now() + (V.every || 1000);
    if (status === 404) return;                                  // not on air yet: asked again in a moment
    if (status !== 200 || !d) { V.next = Date.now() + 3000; return; }
    if (!V.head) {
      if (!d.head) { V.want = -1; return; }
      await begin(d.head);
      if (V.phase !== 'on') return;
    }
    // (a snapshot already taken over once is not taken again: from it, the same steps part the same way)
    if (d.snap && (V.askSnap || d.snap.at > LS.tick) && snapKey(d.snap) !== V.lastSnap) adopt(d.snap);
    V.askSnap = false;
    take(d.batches || []);
    if (d.end) V.end = d.end;
    if (!V.file && Number.isInteger(d.last) && d.last > V.last) V.next = 0;   // there is more: ask again at once
  }

  // records, read as lockstep's own wire reads them: the host's, then the guest's, every step
  function take(batches) {
    for (const b of batches) {
      if (!b || !Number.isInteger(b.from) || !Number.isInteger(b.n) || typeof b.recs !== 'string') continue;
      const end = b.from + b.n - 1;
      if (end >= LS.tick) {
        const raw = atob(b.recs), bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        rOpen(bytes.buffer);
        for (let s = b.from; s <= end; s++) {
          const host = lsRead(), wing = lsRead();
          if (s >= LS.tick && !V.recs.has(s)) V.recs.set(s, { host, wing });
        }
      }
      for (const f of b.fps || []) if (Array.isArray(f) && f[1] > LS.tick) V.fps.set(f[1], f);
      V.last = Math.max(V.last, end);
      V.want = V.last + 1;
    }
  }

  /* ------------------------------ the fight ------------------------------- */
  /* The header: the build, then any pilot from outside it flies (fetched
     from PvP's Worker, which hands one to whoever names a broadcast it flies
     in: pvp/src/hidden.js; or kept in the log), then the run, as a guest
     builds it. */
  async function begin(h) {
    if (!h || h.v !== 1 || !h.run || !Array.isArray(h.hellos) || h.hellos.length !== 2 || !h.hellos[0] || !h.hellos[1])
      return stop('This broadcast can\'t be read.');
    if (h.build !== buildId()) return stop('This fight is being played on another version of the game. Reload the page.');
    V.head = h;
    V.phase = 'load';
    say();
    for (const k of [0, 1]) {
      const hl = h.hellos[k], id = typeof hl.cid === 'string' ? hl.cid : '';
      if (!id || CHARS.some(c => c.id === id)) continue;
      const text = await pilotText(id);
      if (text === null) return stop('The hidden pilot couldn\'t be loaded.');
      try { Outside.run(id, text); }
      catch (e) { console.error('watch: pilot ' + id, e); return stop('The hidden pilot couldn\'t be loaded.'); }
      const mark = (Array.isArray(hl.outs) ? hl.outs : []).find(x => Array.isArray(x) && x[0] === id);
      if (!mark || String(mark[1]) !== OUTSIDE.sig[id]) return stop('This fight\'s hidden pilot is another version of it. Reload the page.');
    }
    build(h);
  }

  async function pilotText(id) {
    if (V.file) return V.file.pilots && typeof V.file.pilots[id] === 'string' ? V.file.pilots[id] : null;
    try {
      const r = await fetch('/api/pvp/pilot?id=' + encodeURIComponent(id) + '&watch=' + V.id, { cache: 'no-store' });
      if (!r.ok) return null;
      const text = await r.text();
      const want = r.headers.get('x-vault-hash'), got = await Outside.hash(text);
      return want && got && want !== got ? null : text;
    } catch (e) { return null; }
  }

  function build(h) {
    const hl = h.hellos, run = h.run;
    const pilotIx = k => mpPeerChar(k ? run.wingId : run.hostId, k ? run.wing : run.host);
    const outsideK = k => !!(CHARS[pilotIx(k)] || {}).outside;
    // the eyes: the side that is not flying from outside (the host's, if neither or both are)
    V.eyes = outsideK(0) && !outsideK(1) ? 1 : 0;
    V.cam = V.eyes;
    V.names = hl.map(x => String((x && x.name) || '').slice(0, 14).toUpperCase());
    M.hand.match = h.match && Array.isArray(h.match.sides) ? h.match : null;
    const me = V.eyes, them = 1 - me;
    Save.profile.name = V.names[me];
    MP.on = true; MP.ready = true; MP.role = me ? 'guest' : 'host';
    MP.peerName = V.names[them];
    MP.peerChar = pilotIx(them);
    MP.peerAwake = !!(them ? run.wingAwake : run.awake);
    MP.peerSkin = { doc: skinClean(hl[them].skin), equip: String(hl[them].equip || '').slice(0, 40) };
    lsGuestStart(run);
    // each pilot in its own player's skin, as their handshakes have it
    for (const k of [0, 1])
      pilotDo(k, () => { pilotSkin = { doc: skinClean(hl[k].skin), equip: String(hl[k].equip || '').slice(0, 40) }; applyChar(selectedChar, true); });
    V.phase = 'on';
    V.acc = 0;
    say();
  }

  // the fighter's game at a step, taken over: as lockstep's guest takes the host's (lsAdopt), with nothing to play again
  function adopt(s) {
    let snap;
    try { snap = JSON.parse(s.json); snapRead(snap); }
    catch (e) { console.error('watch: a snapshot', e); return; }
    LS.paused = !!(snap.ls && snap.ls.paused); LS.pausedBy = (snap.ls && snap.ls.pausedBy) || '';
    LS.epoch = s.epoch; LS.ckMine.clear(); LS.ckTheirs.clear(); LS.ckAt = 0; LS.ckHash = 0;
    LS.tick = s.at;
    V.recs.clear(); V.fps.clear();
    V.last = s.at - 1; V.want = s.at;
    V.lastSnap = snapKey(s);
    V.took.push(V.lastSnap);
    V.adopted++;
  }

  // the steps owed this frame, played; true: the engine leaves them to this
  M.steps = dt => {
    if (!watching()) return false;
    if (V.phase !== 'on') return true;
    if (V.end && LS.tick >= V.end.at) { over(); return true; }
    const held = V.last - LS.tick + 1;
    const keep = Math.max(SEE.KEEP, SEE.KEEP_POLLS * V.every / 1000) * 60;
    // a live fight starts once there is enough in hand to stay behind it without stopping
    if (!V.primed && (V.file || V.end || held >= keep)) V.primed = true;
    if (!V.primed) return true;
    if (!V.file && held > SEE.FAR * 60 && !V.askSnap) { V.askSnap = true; V.next = 0; }
    const speed = V.file ? 1 : held > keep + 300 ? SEE.FAST[1] : held > keep + 60 ? SEE.FAST[0] : 1;
    V.acc = Math.min(V.acc + dt * speed, 0.5);
    let n = 0;
    while (V.acc >= STEP && n < STEPS_PER_FRAME * 2) {
      const cur = V.recs.get(LS.tick);
      if (!cur) break;
      V.recs.delete(LS.tick);
      lsPlay(cur);
      V.acc -= STEP; n++;
      if (V.askSnap) break;
    }
    const now = Date.now();
    if (n || !V.idleSince) V.idleSince = now;
    else if (V.end && now - V.idleSince > SEE.STALL) over();      // the last steps never came
    MP.stalled = false;
    return true;
  };

  /* After each step: its fingerprint against the fighter's, where the
     fighter took one (every second). */
  const played = M.played;
  M.played = (cur, t) => {
    played(cur, t);
    if (!watching() || LS.tick % LS_CHECK) return;
    const f = V.fps.get(LS.tick), mine = LS.ckMine.get(LS.tick);
    if (!f || mine === undefined) return;
    V.fps.delete(LS.tick);
    if (f[0] < LS.epoch) return;                                    // of a game since taken over
    if (f[0] === LS.epoch && f[2] === (mine >>> 0)) { V.checked++; return; }
    V.parted++;
    if (V.adrift) return;
    /* Parted, or the fighter's game was: the latest snapshot. Asked for at
       once the first time; while the latest is one already tried, at the
       relay's own pace, not every second. */
    V.askSnap = true;
    const now = Date.now();
    if (now - (V.askedAt || 0) > 5000) { V.askedAt = now; V.next = 0; }
  };

  // the camera: on whichever pilot it is told
  M.cam = () => (watching() && (V.phase === 'on' || V.phase === 'over') ? pilotP(V.cam) : null);

  /* The end: the result screen (match.js's own). Fought out, from the eyes'
     side. Walked out of, from the side that stayed, as that player's own
     screen has it: the one who left would have none. */
  const flip = r => Object.assign({}, r, { me: r.them, them: r.me, score: [r.score[1], r.score[0]], dealt: [r.dealt[1], r.dealt[0]],
                                           rounds: r.rounds.map(x => Object.assign({}, x, { won: !x.won })) });
  function over() {
    if (V.phase === 'over') return;
    V.phase = 'over';
    const r = V.end && V.end.result, left = V.end ? V.end.left : null;
    if (M.scene) {
      const s = M.scene(r ? (r.winner === V.eyes ? 'won' : 'lost') : 'left');
      M.shown = { at: Date.now(), r: !r && left === V.eyes ? flip(s) : s };
    }
    state = 'pvp';
    say();
  }

  function stop(why) {
    V.phase = 'off';
    V.why = why;
    say();
  }

  /* ------------------------------ the page -------------------------------- */
  const CSS = `
#pvp-watch{position:fixed;inset:0;z-index:10;pointer-events:none;font-family:Barlow,'Segoe UI',system-ui,sans-serif;color:#cbd5e1}
#pvp-watch .bar{position:absolute;top:12px;left:12px;right:12px;display:flex;align-items:center;gap:10px}
#pvp-watch .live{display:inline-flex;align-items:center;gap:7px;padding:5px 10px;border-radius:6px;background:rgba(127,29,29,.88);
  color:#fecaca;font:700 11px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.18em}
#pvp-watch .live i{width:8px;height:8px;border-radius:50%;background:#f87171;box-shadow:0 0 8px #f87171;animation:pvpLive 1.2s ease-in-out infinite}
#pvp-watch .live.done{background:rgba(30,41,59,.9);color:#94a3b8}
#pvp-watch .live.done i{background:#64748b;box-shadow:none;animation:none}
@keyframes pvpLive{50%{opacity:.25}}
#pvp-watch .who{overflow:hidden;white-space:nowrap;text-overflow:ellipsis;font:600 12px 'Chakra Petch',Barlow,sans-serif;
  letter-spacing:.1em;color:#e2e8f0;text-shadow:0 1px 3px #000}
#pvp-watch .x{margin-left:auto;flex:none;pointer-events:auto;cursor:pointer;width:34px;height:34px;border-radius:7px;
  font:700 16px Barlow,sans-serif;background:rgba(8,13,22,.82);border:1px solid rgba(148,163,184,.4);color:#cbd5e1}
#pvp-watch .x:hover{border-color:#f472b6;color:#f472b6}
#pvp-watch .cam{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);max-width:calc(100% - 32px);padding:5px 12px;
  border-radius:6px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;background:rgba(8,13,22,.72);
  font:600 11px 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;color:#94a3b8}
#pvp-watch .card{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:min(400px,calc(100% - 32px));padding:22px;
  border-radius:12px;text-align:center;background:rgba(8,13,22,.95);border:1px solid rgba(244,114,182,.4);pointer-events:auto}
#pvp-watch .card h2{font:700 12px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.2em;color:#f472b6}
#pvp-watch .card p{margin-top:10px;font-size:14px;color:#94a3b8}
#pvp-watch [hidden]{display:none}`;
  let box = null;
  function page() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    box = document.createElement('div');
    box.id = 'pvp-watch';
    box.innerHTML = '<div class="bar"><span class="live"><i></i><b>LIVE</b></span><span class="who"></span>' +
                    '<button class="x" type="button" title="Close" aria-label="Close">✕</button></div>' +
                    '<div class="cam"></div><div class="card"><h2></h2><p></p></div>';
    box.querySelector('.x').addEventListener('click', close);
    document.body.appendChild(box);
    return box;
  }
  const CARD = {
    wait: ['WAITING FOR THE FIGHT', 'It starts here the moment it goes on air.'],
    load: ['LOADING THE FIGHT', ''],
    over: ['THE FIGHT IS OVER', '']
  };
  // what the page says now, from where the fight has got to
  function say() {
    const b = page();
    b.querySelector('.who').textContent = V.head ? V.names[0] + '  VS  ' + V.names[1] : '';
    b.querySelector('.live').classList.toggle('done', V.phase === 'over' || !!V.file);
    b.querySelector('.live b').textContent = V.file ? 'REPLAY' : V.phase === 'over' ? 'ENDED' : 'LIVE';
    const cam = b.querySelector('.cam');
    cam.hidden = V.phase !== 'on';
    cam.textContent = 'CAMERA: ' + (V.names[V.cam] || '') + '   ·   TAB TO SWITCH';
    // the result screen has the end, when it is drawn (art.js); the card has everything else
    const card = b.querySelector('.card');
    card.hidden = V.phase === 'on' || (V.phase === 'over' && !!M.shown && !!window.PVP_ART && typeof PVP_ART.result === 'function');
    const [h2, p] = V.phase === 'off' ? ['CAN\'T WATCH THIS ONE', V.why] : CARD[V.phase] || ['', ''];
    b.querySelector('.card h2').textContent = h2;
    b.querySelector('.card p').textContent = p;
  }

  function close() {
    try { window.close(); } catch (e) {}
    setTimeout(() => { if (!M.leaving) M.leave(); }, 150);
  }

  /* Nothing reaches the game: a viewer has no pilot. Tab moves the camera;
     the page's own button still works. */
  function deaf() {
    const ours = e => !!(box && e.target && typeof box.contains === 'function' && box.contains(e.target));
    for (const t of ['keydown', 'keyup', 'keypress'])
      addEventListener(t, e => {
        if (t === 'keydown' && e.key === 'Tab') { V.cam = 1 - V.cam; say(); }
        if (e.key === 'Tab' || e.key === ' ') e.preventDefault();
        e.stopImmediatePropagation();
      }, true);
    for (const t of ['mousedown', 'mouseup', 'mousemove', 'click', 'dblclick', 'wheel', 'contextmenu',
                     'touchstart', 'touchmove', 'touchend', 'touchcancel', 'pointerdown', 'pointerup'])
      addEventListener(t, e => { if (!ours(e)) e.stopImmediatePropagation(); }, true);
  }

  M.modes.watch = {
    loadout: 'casual',
    start() {
      V.id = M.hand.watch;
      V.v = viewerId();
      state = 'pvp';
      deaf();
      say();
    },
    // the match's step (rounds.js), as a fighter's machine runs it
    waves(dt) { M.rounds.tick(dt); },
    frame() {
      if (V.phase === 'off') return;
      const due = V.file ? !V.head || V.askSnap : V.phase !== 'over' && Date.now() >= V.next;
      if (due && !V.busy) poll();
      if (V.phase === 'on' && state === 'play') {
        // the crosshair: where the pilot whose eyes these are is aiming
        const p = pilotP(V.eyes), s = aimSens();
        if (p && p.in && s > 0) {
          mouse.x = W / 2 + ((p.in.ax - cam.x) * camZoom + cam.sx) / s;
          mouse.y = H / 2 + ((p.in.ay - cam.y) * camZoom + cam.sy) / s;
        }
      }
      if (V.phase === 'on' && box) box.querySelector('.cam').textContent = 'CAMERA: ' + (V.names[V.cam] || '') + '   ·   TAB TO SWITCH';
    }
  };

  // a log in hand, played as if it were on air, from its start (the replay; the tests)
  V.play = log => { V.file = log; V.next = 0; };
})();
