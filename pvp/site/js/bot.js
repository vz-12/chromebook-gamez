/* ===========================================================================
   VOIDRUNNER PvP — a bot, while the queue finds nobody (PVP-PLAN.md, Phase 8)

   A ticket that has waited a while with nobody to pair it with is found a
   bot by the queue (pvp/src/bots.js): after every real pairing, never in
   place of one. The lobby brings it here ({ mode: 'bot', bot, search }), and
   this file flies it, on this machine alone:

     the match   the lockstep the game plays every match on, with no other
                 machine in it. This player's pilot is the first, as a host's
                 is; the bot's is the second. Its record for each step is
                 written here at the moment this player's own is sampled,
                 LS.delay steps ahead, so it plays under the delay a person
                 would. Its choices (its cards, its gear) ride its records, as
                 a guest's do. rounds.js runs the match as any other
     the brain   what the bot does with its pilot: closes to its weapon's
                 range and circles, leads its shots, sidesteps what is coming
                 at it, uses its kit and picks its cards. How well (BRAIN) is
                 its skill, from the server: the higher the player's rating,
                 the better the bot. It plays by the same rules and caps as
                 anyone; only its judgement changes
     the queue   the ticket waits on: this page polls it as the lobby did,
                 with the lobby's own tab mark. A real opponent found, the bot
                 match is let go and the real one joined at once. Leaving goes
                 back to the lobby still searching

   Nothing about a bot match is sent anywhere or kept: no referee, no
   rating, no record. Its own dice are its own (BRAIN.rng), never the run's.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;
  const botting = () => !!(M.hand && M.hand.mode === 'bot');

  /* How a bot flies, between skill 0 and skill 1: [at 0, at 1]. */
  const BRAIN = M.BRAIN = {
    react: [20, 4],         // steps it sees its rival late by (on top of LS.delay)
    wobble: [64, 6],        // px its aim wanders, either way
    lead: [0.35, 1],        // how much of a moving target's path it leads
    dodge: [0.06, 0.8],     // the chance it sidesteps a shot it sees coming
    dashDodge: 0.45,        // from this skill it dashes out of the way too
    parry: [0.04, 0.6],     // THE VAGRANT: the chance it parries one instead
    trigger: [0.55, 0.97],  // the share of the time it keeps firing
    kit: [11, 3],           // seconds between its kit's moves
    think: [1.7, 0.45],     // seconds it weighs a card
    rare: [0, 0.85],        // the chance it takes the rarest card on offer, not any
    retreat: 0.55           // from this skill it backs off when low
  };
  const lerp = (a, s) => a[0] + (a[1] - a[0]) * s;
  const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
  const HANDOFF = 1800;     // ms from a real opponent found to joining them
  const EVERY = 2000;       // ms between the ticket's polls

  // a small seeded generator: the bot's own dice
  function dice(seed) {
    let a = seed >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  const B = M.botMatch = {
    spec: null, skill: 0.5, rng: Math.random, hi: -1,
    seen: [], turn: 1, turnAt: 0, fireOn: true, fireAt: 0, kitAt: 0, uiAt: -1e9, thinkAt: -1, judged: new WeakMap(), ph: 0,
    human: null,             // this player's own record: null for the devices (a test stands in here)
    search: null,            // the ticket, waiting on: { queue, tab, t0, pilot, on, why, next, busy, botSeen, found, foundAt }
    done: false, handing: false, box: null
  };

  /* The bot as the server described it, made safe: a pilot of the game's
     own, a name that says BOT, a skill from 0 to 1. */
  function specOf(b) {
    const o = b && typeof b === 'object' ? b : {};
    const c = CHARS.find(x => x.id === o.pilot && !x.outside) || CHARS[0];
    const name = String(o.name || '').toUpperCase().replace(/[^A-Z0-9 ]/g, '').slice(0, 14);
    const skill = Number.isFinite(o.skill) ? Math.min(1, Math.max(0, o.skill)) : 0.45;
    return { id: typeof o.id === 'string' && /^[0-9a-f]{8}$/.test(o.id) ? o.id : '', pilot: c.id, awake: !!o.awake, skill,
             name: /^BOT /.test(name) ? name : 'BOT', seed: Number.isFinite(o.seed) ? o.seed >>> 0 : 1 };
  }

  /* -------------------------------- the brain ------------------------------ */
  const OFFERS = () => PILOT_VARS.indexOf('offers'), GEAR = () => PILOT_VARS.indexOf('gearOffer');
  // pilot 1's own, flying or not
  const own = (name, i) => (PILOT.on === 1 ? (name === 'offers' ? offers : gearOffer) : PILOTS[1] && PILOTS[1].v[i]);

  // a card or a piece of gear, after a moment's thought; false: nothing to choose
  function choose(k, rec) {
    const offs = own('offers', OFFERS()) || [], gear = own('gearOffer', GEAR());
    const up = (state === 'levelup' && offs.length) || (state === 'gear' && gear);
    if (!up) { B.thinkAt = -1; return false; }
    if (k <= B.uiAt + LS.delay + 2) return true;             // its last choice has not landed yet
    if (B.thinkAt < 0) { B.thinkAt = k + Math.round(60 * lerp(BRAIN.think, B.skill) * (0.7 + 0.6 * B.rng())); return true; }
    if (k < B.thinkAt) return true;
    let act, i = 0;
    if (state === 'levelup') {
      act = 'pick';
      i = Math.floor(B.rng() * offs.length);
      if (B.rng() < lerp(BRAIN.rare, B.skill)) {
        let best = -1;
        offs.forEach((u, j) => { const r = RANK[u && u.rar] || 0; if (r > best) { best = r; i = j; } });
      }
    } else act = B.rng() < 0.75 ? 'gearTake' : 'gearLeave';
    rec.ui = [UI_NAMES.indexOf(act), i];
    B.uiAt = k; B.thinkAt = -1;
    return true;
  }

  // the shot or blow most about to land on it, of those it can see
  function threat(me, foe) {
    let best = null, soon = 0.55;
    const look = b => {
      const rx = me.x - b.x, ry = me.y - b.y, vv = b.vx * b.vx + b.vy * b.vy;
      if (!(vv > 1)) return;
      const t = (rx * b.vx + ry * b.vy) / vv;
      if (t <= 0 || t >= soon) return;
      const cx = rx - b.vx * t, cy = ry - b.vy * t;
      if (cx * cx + cy * cy < Math.pow((me.r || 12) + (b.r || 4) + 16, 2)) { best = b; soon = t; }
    };
    for (const b of bullets) if (b.by === foe) look(b);
    for (const b of ebullets) look(b);
    return best ? { b: best, t: soon } : null;
  }

  // the nearest of the room's own (or the rival's army) close enough to matter
  function pest(me, d) {
    let best = null, bd = Math.min(170, d * 0.7);
    for (const e of enemies) {
      if (e.pvpPilot != null || (e.hacked && e.hackPid === 1)) continue;
      const dd = Math.hypot(e.x - me.x, e.y - me.y);
      if (dd < bd) { best = e; bd = dd; }
    }
    return best;
  }

  /* The bot's record for step k, written as this player's is sampled: what
     it sees is the game as it stands now, and its rival as it stood a
     moment ago (BRAIN.react). */
  function think(k, rec) {
    const me = pilotP(1), foe = pilotP(0), s = B.skill, R = B.rng;
    if (!me || !foe) return;
    B.seen.push([foe.x, foe.y, foe.vx || 0, foe.vy || 0]);
    const lag = Math.round(lerp(BRAIN.react, s));
    while (B.seen.length > lag + 1) B.seen.shift();
    if (choose(k, rec)) return;
    const m = typeof RUN !== 'undefined' && RUN.pvp;
    if (state !== 'play' || !m || m.phase !== 'fight' || me.down) return;

    const [fx, fy, fvx, fvy] = B.seen[0];
    const dx = fx - me.x, dy = fy - me.y, d = Math.hypot(dx, dy) || 1;
    let [near, far] = me.weapon === 'laser' ? [110, 195] : me.weapon === 'blade' ? [40, 85] : [210, 420];
    // a gun keeps clear of a lance's or a blade's reach, the better the bot the further
    if (me.weapon === 'bullet' && foe.weapon !== 'bullet') near = Math.max(near, lerp([170, 270], s));
    const low = me.maxHp ? me.hp / me.maxHp : 1;
    if (s >= BRAIN.retreat && low < 0.3 && me.weapon !== 'blade') { near += 120; far += 140; }

    // circling: one way, then the other
    if (k >= B.turnAt) { B.turn = R() < 0.5 ? -B.turn : B.turn; B.turnAt = k + Math.round(60 * (1 + R() * 2.6)); }
    const close = d > far ? 1 : d < near ? -1 : 0.12 * B.turn;
    let vx = close * dx / d - B.turn * 0.85 * dy / d, vy = close * dy / d + B.turn * 0.85 * dx / d;

    // a shot coming: sidestep it (judged once a shot, so it never just rolls until it dodges)
    const th = threat(me, foe);
    if (th) {
      let j = B.judged.get(th.b);
      if (j === undefined) {
        j = me.charId === 'melee' && R() < lerp(BRAIN.parry, s) ? 'parry' : R() < lerp(BRAIN.dodge, s) ? 'dodge' : 'take';
        B.judged.set(th.b, j);
      }
      if (j === 'parry' && th.t < 0.2) rec.press.push('f');
      else if (j === 'dodge') {
        const sp = Math.hypot(th.b.vx, th.b.vy) || 1, side = (me.x - th.b.x) * th.b.vy - (me.y - th.b.y) * th.b.vx >= 0 ? 1 : -1;
        vx = side * th.b.vy / sp * 1.6 + vx * 0.3; vy = -side * th.b.vx / sp * 1.6 + vy * 0.3;
        if (s >= BRAIN.dashDodge && th.t < 0.22 && me.dashCh > 0) rec.dash = true;
      }
    }
    // the walls push back
    const pad = 150;
    if (me.x - arena.x0 < pad) vx += 1.6 * (1 - (me.x - arena.x0) / pad);
    if (arena.x1 - me.x < pad) vx -= 1.6 * (1 - (arena.x1 - me.x) / pad);
    if (me.y - arena.y0 < pad) vy += 1.6 * (1 - (me.y - arena.y0) / pad);
    if (arena.y1 - me.y < pad) vy -= 1.6 * (1 - (arena.y1 - me.y) / pad);
    rec.mx = Math.abs(vx) > 0.3 ? Math.sign(vx) : 0;
    rec.my = Math.abs(vy) > 0.3 ? Math.sign(vy) : 0;
    // a blade dashes in
    if (me.weapon === 'blade' && d > 180 && d < 420 && me.dashCh > 0 && R() < 0.03 * s) rec.dash = true;

    // aim: at whatever of the room is in its face, else the rival, led and a little off
    const e = pest(me, d);
    let ax = fx, ay = fy, tvx = fvx, tvy = fvy;
    if (e) { ax = e.x; ay = e.y; tvx = e.vx || 0; tvy = e.vy || 0; }
    const td = Math.hypot(ax - me.x, ay - me.y);
    const lead = me.weapon === 'bullet' ? td / (me.bspeed || 700) * lerp(BRAIN.lead, s) : 0;
    const wob = lerp(BRAIN.wobble, s);
    rec.ax = ax + tvx * lead + Math.sin(k * 0.071 + B.ph) * wob;
    rec.ay = ay + tvy * lead + Math.cos(k * 0.053 + B.ph * 1.7) * wob;

    // the trigger: held most of the time, the better the bot the more
    if (k >= B.fireAt) { B.fireOn = R() < lerp(BRAIN.trigger, s); B.fireAt = k + 18 + Math.floor(R() * 42); }
    const reach = me.weapon === 'blade' ? 150 : me.weapon === 'laser' ? 320 : 700;
    rec.trig = rec.lmb = B.fireOn && (td < reach || !!e);

    // the kit: an awake pilot's moves, EMBER's vent, now and then
    if (k >= B.kitAt) {
      B.kitAt = k + Math.round(60 * lerp(BRAIN.kit, s) * (0.7 + 0.6 * R()));
      if (me.awake && d < 520) rec.press.push(['z', 'x', 'c', 'v'][Math.floor(R() * 4)]);
      else if (me.charId === 'ember' && d < 300) rec.press.push('f');
    }
  }

  /* LS.source while a bot match runs: this player's own record (the devices),
     and the bot's for the same step, into the slot a partner's would fill. */
  function feed(rec) {
    (B.human || inputSample)(rec);
    const k = ++B.hi, b = newInput();
    try { think(k, b); }
    catch (e) { if (!B.threw) { B.threw = true; console.error('pvp bot', e); } }
    LS.theirs.set(k, lsCanon(b, false));
    LS.peerNeed = k + 1;                   // nobody to send to: this player's own records go once played
  }

  /* -------------------------------- the queue ------------------------------ */
  const mmss = ms => { const s = Math.max(0, Math.floor(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  async function q(body) {
    try {
      const r = await fetch('/api/pvp/queue', { method: 'POST', cache: 'no-store', credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      return { ok: r.ok, status: r.status, d: await r.json().catch(() => null) };
    } catch (e) { return { ok: false, status: 0, d: null }; }
  }
  function stop(why) { const S = B.search; S.on = false; S.why = why; say(); }
  function heard(r) {
    const S = B.search;
    S.busy = false;
    S.next = Date.now() + (r.ok ? EVERY : 3000);
    if (!S.on) return;
    if (r.status === 401) { stop('SIGNED OUT'); return; }
    if (!r.ok || !r.d) return;                                       // a blip: asked again
    if (r.d.state === 'matched' && r.d.match && Array.isArray(r.d.match.sides)) { found(r.d.match); return; }
    if (r.d.state === 'elsewhere') { stop('SEARCHING IN ANOTHER TAB'); return; }
    if (r.d.state === 'none') { rejoin(); return; }
    if (r.d.bot && typeof r.d.bot.id === 'string') S.botSeen = r.d.bot.id;   // the lobby is told it's done with this one too
  }
  // the ticket went (a tab asleep too long): back in the queue as the same tab
  async function rejoin() {
    const S = B.search;
    S.busy = true;
    const r = await q({ op: 'join', queue: S.queue, tab: S.tab, pilot: S.pilot });
    if (!r.ok && r.status !== 401) { S.busy = false; stop('SEARCH ENDED'); return; }
    heard(r);
  }
  function tickSearch() {
    const S = B.search;
    if (!S || !S.on || S.busy || Date.now() < S.next) return;
    S.busy = true;
    q({ op: 'poll', queue: S.queue, tab: S.tab }).then(heard);
  }
  // a real opponent: this match is let go, and theirs joined
  function found(match) {
    const S = B.search;
    S.on = false; S.found = match; S.foundAt = Date.now();
    const them = match.sides[1 - match.side];
    banner('A PILOT WAS FOUND   ·   ' + String(them && them.name || 'JOINING').toUpperCase(), '#f472b6', HANDOFF / 1000 + 1);
    say();
  }
  function goReal() {
    const S = B.search, m = S.found;
    const hand = { mode: 'match', role: m.role, queue: S.queue, pilot: m.sides[m.side].pilot, match: m, me: M.hand.me, outside: [] };
    try { sessionStorage.setItem('vr_pvp_play', JSON.stringify(hand)); }
    catch (e) { back(); return; }                                    // the lobby, polling, finds the match all the same
    B.handing = true; M.leaving = true;
    location.href = '/play/';
  }
  /* Back to the lobby, still searching: the ticket, and the bot it's done
     with, so the lobby carries on where this left off. */
  function back() {
    if (M.leaving) return;
    const S = B.search;
    if (S && (S.on || S.found)) {
      try {
        sessionStorage.setItem('vr_pvp_search', JSON.stringify({ queue: S.queue, tab: S.tab, t0: S.t0, pilot: S.pilot,
                                                                 botOver: S.botSeen || '', at: Date.now() }));
      } catch (e) {}
    }
    B.handing = true;
    M.leave();
  }

  /* ---------------------------- what is on screen -------------------------- */
  // the search, one line in the HUD's column: under the match's (rounds.js) and the rival's card (the engine's mpDrawHud, 118 to 164)
  const searchWords = () => {
    const S = B.search;
    if (!S) return '';
    if (S.found) return 'A PILOT WAS FOUND   ·   JOINING';
    if (S.on) return 'STILL SEARCHING ' + (S.queue === 'ranked' ? 'RANKED' : 'CASUAL') + '   ·   ' + mmss(Date.now() - S.t0);
    return S.why;
  };
  const hud = M.hud;
  M.hud = () => {
    const drew = hud();
    const line = drew && botting() ? searchWords() : '';
    if (line) {
      ctx.save();
      ctx.textAlign = 'right';
      ctx.letterSpacing = '0.12em';
      fitFont(line, Math.max(96, W * 0.4), '600', 10, "Barlow, 'Segoe UI', system-ui, sans-serif", 8);
      ctx.fillStyle = B.search && B.search.found ? '#f472b6' : '#5b6b82';
      ctx.fillText(line, W - 18, 182);
      ctx.restore();
    }
    return drew;
  };

  // what kind of match, for the belt and the result (art.js): a bot's, unrated
  const versus = M.versus;
  M.versus = () => {
    const v = versus();
    return botting() ? Object.assign(v, { queue: 'bot', league: null, rated: false }) : v;
  };

  const CSS = `
#pvp-bot{position:fixed;left:0;right:0;bottom:0;z-index:10;display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:0 16px 5vh;font-family:Barlow,'Segoe UI',system-ui,sans-serif;color:#cbd5e1;pointer-events:none}
#pvp-bot[hidden]{display:none}
#pvp-bot h2{font:700 22px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.2em;color:#e2e8f0}
#pvp-bot .line{font:600 11px 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.08em;color:#94a3b8;text-align:center}
#pvp-bot button{pointer-events:auto;padding:10px 18px;border-radius:7px;cursor:pointer;background:rgba(8,13,22,.82);
  border:1px solid rgba(103,232,249,.6);color:#67e8f9;font:700 11px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.14em}
#pvp-bot button:hover{background:rgba(103,232,249,.22)}
#pvp-bot.art h2{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}`;
  // the match is over: its result (art.js draws it), and the way back
  function say() {
    if (!B.box) return;
    const S = B.search;
    B.box.querySelector('.line').textContent = S ? searchWords() : '';
  }
  function overlay(title) {
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    const box = B.box = document.createElement('div');
    box.id = 'pvp-bot';
    box.innerHTML = '<h2></h2><p class="line"></p><button type="button">BACK TO THE LOBBY</button>';
    box.querySelector('h2').textContent = title;
    if (window.PVP_ART && typeof PVP_ART.result === 'function') box.classList.add('art');
    for (const t of ['keydown', 'keyup']) box.addEventListener(t, e => e.stopPropagation());
    box.querySelector('button').addEventListener('click', back);
    document.body.appendChild(box);
    say();
  }
  function finish(m) {
    B.done = true;
    const won = m.winner === pilotMine();
    if (M.scene) {
      M.shown = { at: Date.now(), r: M.scene(won ? 'won' : 'lost') };
      M.shown.r.verdict = { v: 'bot', won };                           // nothing to referee: art.js says NOT RECORDED
    }
    state = 'pvp';
    overlay((won ? 'VICTORY  ' : 'DEFEAT  ') + m.score[pilotMine()] + ' — ' + m.score[1 - pilotMine()]);
  }

  /* -------------------------------- the mode ------------------------------- */
  M.modes.bot = {
    // the queue's own loadout: a ranked search's bot match flies what ranked would
    get loadout() { return M.hand && M.hand.search && M.hand.search.queue === 'ranked' ? 'ranked' : 'casual'; },
    start() {
      const spec = B.spec = specOf(M.hand.bot);
      B.skill = spec.skill; B.rng = dice(spec.seed); B.ph = B.rng() * 10;
      const s = M.hand.search;
      if (s && (s.queue === 'ranked' || s.queue === 'casual') && typeof s.tab === 'string' && /^[0-9a-f]{16}$/.test(s.tab))
        B.search = { queue: s.queue, tab: s.tab, t0: Number.isFinite(s.t0) ? s.t0 : Date.now(), pilot: M.hand.pilot, on: true, why: '',
                     next: Date.now() + EVERY, busy: false, botSeen: spec.id, found: null, foundAt: 0 };
      // the bot, as a guest's hello would put it: its pilot, its name, no reward upgrades
      MP.role = 'host'; MP.on = true; MP.ready = true;
      MP.peerName = spec.name; MP.peerChar = CHARS.findIndex(c => c.id === spec.pilot); MP.peerAwake = spec.awake;
      M.peerHello({ v: 1, ups: [] });
      lsHostStart();
      B.hi = LS.delay - 1;                 // lsBegin filled both pilots' first steps with nothing pressed
      LS.source = feed;
      // closing the tab: the ticket goes with it, so nobody is paired with a page that's gone
      addEventListener('pagehide', () => {
        const S = B.search;
        if (!S || !S.on || B.handing) return;
        try {
          fetch('/api/pvp/queue', { method: 'POST', keepalive: true, credentials: 'same-origin',
            headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'leave', queue: S.queue, tab: S.tab }) });
        } catch (e) {}
      });
    },
    // the match's step (rounds.js)
    waves(dt) { M.rounds.tick(dt); },
    frame() {
      tickSearch();
      const S = B.search;
      if (S && S.found && Date.now() - S.foundAt >= HANDOFF) { goReal(); return; }
      if (B.done) { if (state !== 'pvp') state = 'pvp'; say(); return; }
      const m = typeof RUN !== 'undefined' && RUN.pvp;
      if (LS.on && m && m.run === LS.run && m.phase === 'over') { finish(m); return; }
      // left from the game's own pause screen
      if (state === 'menu' || state === 'dead') back();
    }
  };
})();
