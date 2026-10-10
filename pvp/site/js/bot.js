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
                 range and circles, leads its shots, reads what is about to
                 land on it (incoming) and sidesteps it or, THE VAGRANT,
                 parries it at the window's perfect opening (parry); wakes an
                 awake pilot's form and spends its moves by cost, reach and
                 cooldown (kit); picks its cards. How well (BRAIN) is its
                 skill, from the server: the higher the player's rating, the
                 better the bot. It plays by the same rules and caps as
                 anyone; only its judgement changes
     the queue   the ticket waits on: this page polls it as the lobby did,
                 with the lobby's own tab mark. A real opponent found, the bot
                 match is let go and the real one joined at once. Leaving goes
                 back to the lobby still searching
     the rating  in ranked, the queue is told the match has started, and then
                 how it ended: the score, or that the player walked out (a
                 loss), and the rating it comes to is on the result screen
                 (pvp/src/objects.js, botOp). In casual nothing is sent

   Nothing referees a bot match: no other machine plays it. Its own dice are
   its own (B.rng), never the run's.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;
  const botting = () => !!(M.hand && M.hand.mode === 'bot');

  /* How a bot flies, between skill 0 and skill 1: [at 0, at 1]. Hard in
     general (user, 9 Oct: "make them more difficult"): even the gentlest
     leads its shots a little and dodges now and then. */
  const BRAIN = M.BRAIN = {
    react: [16, 2],         // steps it sees its rival late by (on top of LS.delay)
    wobble: [52, 3],        // px its aim wanders, either way
    lead: [0.5, 1],         // how much of a moving target's path it leads
    dodge: [0.15, 0.92],    // the chance it sidesteps a blow it sees coming
    dashDodge: 0.3,         // from this skill it dashes out of the way too
    parry: [0.4, 1],        // THE VAGRANT: the chance it tries to parry a blow it sees coming
    parryErr: [0.06, 0.003],// and how far off its timing is, in seconds, either way
    parryAt: 0.012,         // where in the window it means the blow to land: its opening (perfect is the first PERFECT_WIN)
    parryTight: -0.004,     // and with another right behind it, the very first moment, so one window takes both
    steady: 0.35,           // seconds out a round has to be for it to hold its heading until the round arrives
    swingSee: [8, 0],       // steps it notices a rival's swing late by
    trigger: [0.7, 1],      // the share of the time it keeps firing
    kit: [3.5, 0.6],        // seconds it waits after a move before the next
    wake: [3, 0.2],         // seconds a full meter waits before it spends it on its form
    place: [0.35, 1],       // how much of the rival's path a move laid on the floor leads
    think: [1.3, 0.35],     // seconds it weighs a card
    rare: [0.25, 0.95],     // the chance it takes the rarest card on offer, not any
    retreat: 0.35,          // from this skill it backs off when low
    press: 0.5,             // and from this one it closes on a rival that is low, and never lets off the trigger
    pressAt: 0.35           // what "low" is: this share of health or less
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
    seen: [], turn: 1, turnAt: 0, fireOn: true, fireAt: 0, kitAt: 0, uiAt: -1e9, thinkAt: -1, judged: new Map(), ph: 0,
    swingId: 0, swingSeen: 0, chargePrev: 0, chargeRate: 0, beams: 0, beamOn: false, lanceReach: 260, myReach: 260,
    guardTo: -1, fullAt: -1, markAt: 0, steadyTo: -1, mx: 0, my: 0, plan: null,
    human: null,             // this player's own record: null for the devices (a test stands in here)
    search: null,            // the ticket, waiting on: { queue, tab, t0, pilot, on, why, next, busy, botSeen, found, foundAt }
    done: false, handing: false, box: null,
    rated: false,            // the queue said it rates this one (ranked)
    over: false              // and has been told how it ended, or that the player walked out
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

  /* --------------------------- what is coming at it --------------------------
     The blow most about to land, and in how many seconds, of those the bot
     can see: rounds in the air (its rival's, and the room's), its rival's
     lance (a beam across it, or the aim on it with the shot about to go), its
     rival's blade (a swing begun within reach, noticed a moment late on lower
     skill), and its rival's army leaning in. Each has a key, so the bot judges
     each blow once (B.judged). */
  /* Seconds until a round first touches the bot, if it will in the next while:
     against the bot as it is moving (a round that will pass behind a hull on
     the move is no blow). */
  function shotT(me, b) {
    const R = (me.r || 12) + (b.r || 4) + 4;
    const vx = b.vx - (me.vx || 0), vy = b.vy - (me.vy || 0);
    const rx = b.x - me.x, ry = b.y - me.y, vv = vx * vx + vy * vy;
    if (!(vv > 1)) return Infinity;
    const c = rx * rx + ry * ry - R * R;
    if (c <= 0) return 0;
    const bq = rx * vx + ry * vy;
    if (bq >= 0) return Infinity;                      // going away
    const disc = bq * bq - vv * c;
    return disc < 0 ? Infinity : (-bq - Math.sqrt(disc)) / vv;
  }
  const onBeam = (me, foe) => (foe.laserSegs || []).some(g => segCircle(g.x1, g.y1, g.x2, g.y2, me.x, me.y, (me.r || 12) + 10));
  function incoming(me, foe, k) {
    let best = null, next = Infinity;            // and when the blow after it lands
    const take = (t, kind, key, src) => {
      if (!(t < 0.6)) return;
      if (!best || t < best.t) { if (best) next = Math.min(next, best.t); best = { t, kind, key, src, next: Infinity }; }
      else next = Math.min(next, t);
    };
    for (const b of bullets) if (b.by === foe) take(shotT(me, b), 'shot', b, b);
    for (const b of ebullets) take(shotT(me, b), 'shot', b, b);
    if (foe.down) return best;
    const dx = me.x - foe.x, dy = me.y - foe.y, d = Math.hypot(dx, dy) || 1;
    if (foe.weapon === 'laser') {
      const on = Math.abs(bladeDelta(foe.ang, Math.atan2(dy, dx))) < 0.2 && d < B.lanceReach;
      if (foe.laserT > 0 && onBeam(me, foe)) take(0, 'beam', 'beam' + B.beams, foe);
      else if (on && foe.awake) take(0.03, 'beam', 'beam' + B.beams, foe);       // an awakened lance goes the moment it can
      else if (on && foe.charge > 0 && B.chargeRate > 0) take((1 - foe.charge) / B.chargeRate, 'beam', 'beam' + B.beams, foe);
    }
    // a swing's edge crosses the middle of its arc halfway through it: what is there is struck then
    if (foe.weapon === 'blade' && foe.swingT > 0 && d < (foe.swingReach || 90) + (me.r || 12) + 12
        && k - B.swingSeen >= Math.round(lerp(BRAIN.swingSee, B.skill)))
      take(Math.max(0, foe.swingT - SWING_T / 2), 'swing', 'swing' + foe.swingId, foe);
    for (const e of enemies) {
      if (e.dead || !e.hacked || e.hackPid !== pilotMine()) continue;
      const gap = Math.hypot(e.x - me.x, e.y - me.y) - (e.r || 12) - (me.r || 12);
      if (gap < 40) take(Math.max(0, gap) / Math.max(80, Math.hypot(e.vx || 0, e.vy || 0)), 'body', e, e);
    }
    if (best) best.next = next;
    return best;
  }

  /* ------------------------------- the parry ----------------------------------
     THE VAGRANT's verb. The press lands LS.delay steps after it is made and
     the window opens then; a blow inside its first PERFECT_WIN is a perfect
     parry, a counter thrown back along the guard. So the bot presses as the
     blow is that delay and a little more away, by its own reading of it (a
     timing error drawn once a blow, smaller the better it is), never on a
     cooldown, and keeps its guard on its rival until the window closes, so
     the counter goes home. A chain one short of RONIN is when it tries
     hardest. */
  // RONIN is a perfect parry or three away: the parries matter most now
  const focusing = me => me.charId === 'melee' && !!me.awake && !(me.roninT > 0) && (me.chain || 0) >= CHAIN_MAX - 3;
  function parry(me, k, rec, inc) {
    if (me.charId !== 'melee' || !inc || me.parryCd > 0 || me.parryT > 0) return false;
    let j = B.judged.get(inc.key);
    if (!j) {
      const focus = focusing(me);
      const err = lerp(BRAIN.parryErr, B.skill) * (focus ? 0.6 : 1);
      j = { go: B.rng() < Math.min(0.98, lerp(BRAIN.parry, B.skill) * (focus ? 1.25 : 1)),
            err: (B.rng() + B.rng() + B.rng() - 1.5) * 2 * err };
      if (B.judged.size > 256) B.judged.clear();
      B.judged.set(inc.key, j);
    }
    if (!j.go) return false;
    /* It sees the game as the last step left it, and the press lands LS.delay
       steps after the coming one: the window opens that long from now. The
       blow is meant for its very opening, perfect, and so a window that also
       covers whatever follows close behind (a gun's next round). */
    const open = (LS.delay + 1) * STEP;
    const both = inc.next - inc.t < PARRY_WIN;                 // the next blow can share the window, if it opens on the first
    if (inc.t > open + (both ? BRAIN.parryTight : BRAIN.parryAt) + j.err) return false;
    rec.press.push('f');
    B.guardTo = k + LS.delay + Math.ceil(PARRY_WIN / STEP);
    return true;
  }

  /* ---------------------------- forms and moves ------------------------------
     An awake pilot's transformation and the four moves it opens, by what each
     costs, reaches and waits on. A full meter is spent once the fight is on
     (a moment late on lower skill: BRAIN.wake); a move is chosen by where the
     rival is, and a move laid on the floor is laid where the rival will be.
     Returns what holds the hull ('busy': up in BRAND, held in SCORCH, or a
     cut-in), the form it fights in ('fusion', 'root'), or nothing; and `aim`,
     where the press that goes with it points. */
  const ahead = (v, t) => [v.fx + v.fvx * t * lerp(BRAIN.place, B.skill), v.fy + v.fvy * t * lerp(BRAIN.place, B.skill)];
  function wake(full, v, k) {
    if (!full || v.d > 650) { B.fullAt = -1; return false; }
    if (B.fullAt < 0) B.fullAt = k + Math.round(60 * lerp(BRAIN.wake, B.skill) * (0.6 + 0.8 * B.rng()));
    if (k < B.fullAt) return false;
    B.fullAt = -1;
    return true;
  }
  // what EMBER saves its heat for next: [move, cost, weight at skill 0, weight at skill 1]
  const PLANS = () => [['z', SCORCH_COST, 3, 1], ['x', PYRO_COST, 4, 3], ['c', STRIKE_COST, 2, 4], ['v', FUSION_COST, 1, 2]];
  function planOf(me) {
    const ws = PLANS().map(([key, cost, w0, w1]) => ({ key, cost, w: lerp([w0, w1], B.skill) }));
    let r = B.rng() * ws.reduce((a, x) => a + x.w, 0);
    for (const x of ws) if ((r -= x.w) <= 0) return x;
    return ws[0];
  }
  const move = (k, rec, key, aim) => { rec.press.push(key); B.kitAt = k + Math.round(60 * lerp(BRAIN.kit, B.skill) * (0.7 + 0.6 * B.rng())); return aim || null; };
  function kit(me, foe, k, rec, v, inc) {
    if (!me.awake) return {};
    const hp = me.maxHp ? me.hp / me.maxHp : 1, ready = k >= B.kitAt;
    if (me.charId === 'ember') {
      if (!(me.ventT > 0)) { if (wake(me.vent >= VENT_MAX, v, k)) rec.press.push('f'); return {}; }   // OVERDRIVE
      const st = me.odStrike;
      if (st) {
        // BRAND, up there: the mark where the rival will be when the foot comes down; then, hot enough, the ring
        if (st.ph === 'aim' && k >= B.markAt) { B.markAt = k + 20; rec.press.push('c'); return { form: 'busy', aim: ahead(v, 0.5) }; }
        if (B.skill >= 0.6 && !st.ringQ && (st.ph === 'tell' || st.ph === 'fire') && me.vent >= SCORCH_COST) rec.press.push('z');
        return { form: 'busy', aim: [v.fx, v.fy] };
      }
      if (me.odScorch) return { form: 'busy' };
      if (me.odFusion) return { form: 'fusion' };
      /* Heat is the whole budget, and the cheap move would always win it, so
         the bot saves for one move at a time (B.plan, drawn after each spend,
         the dearer ones likelier the better it is) and spends when it has the
         heat and the rival is where that move wants it. */
      if (!B.plan) B.plan = planOf(me);
      if (!ready || me.vent < B.plan.cost) return {};
      const lateral = Math.abs(v.fvx * (v.fy - me.y) - v.fvy * (v.fx - me.x)) / (v.d || 1);
      const go = key => { B.plan = null; return move(k, rec, key, key === 'x' ? ahead(v, PYRO_DELAY) : key === 'z' ? ahead(v, 0.15) : null); };
      const p = B.plan.key;
      if (p === 'v' && v.d < 320 && hp > 0.35) return { aim: go('v') };
      if (p === 'c' && v.d > 140 && v.d < 800) return { aim: go('c') };
      if (p === 'x' && v.d < 650) return { aim: go('x') };
      if (p === 'z' && v.d > B.myReach * 0.6 && v.d < B.myReach * 2 && lateral < 140) return { aim: go('z') };
      // saved up and the rival never came where the plan wanted it: anything that fits now
      if (me.vent >= VENT_MAX * 0.9) {
        if (v.d < 650 && me.vent >= PYRO_COST) return { aim: go('x') };
        if (v.d > 140 && v.d < 800 && me.vent >= STRIKE_COST) return { aim: go('c') };
      }
      return {};
    }
    if (me.charId === 'hacker') {
      if (!(me.suT > 0)) { if (wake((me.suRoot || 0) >= SU_MAX, v, k)) rec.press.push('f'); return {}; }   // SUPERUSER
      if (me.suIntro && !me.suIntro.cut) return { form: 'busy' };
      const form = me.suAsc ? 'root' : null, cd = me.suCd || [0, 0, 0, 0];
      if (!ready) return { form };
      const mane = me.suDrill || me.suPlunge || me.suDrain || me.suFling;
      let army = 0;
      for (const e of enemies) if (!e.dead && e.hacked && e.hackPid === 1) army++;
      if (!me.suAsc && !me.suAscUsed && v.d < 420) return { form, aim: move(k, rec, 'v') };                          // ROOT, once
      if (!mane && cd[0] <= 0 && v.d < DRILL_RANGE - 20) return { form, aim: move(k, rec, 'z', ahead(v, DRILL_WIND)) };  // the mane
      if (!mane && cd[1] <= 0 && v.d < DRILL_RANGE) return { form, aim: move(k, rec, 'x', ahead(v, KIT_PLUNGE)) };    // the zone, where it is going
      if (!mane && cd[2] <= 0 && army >= 2 && hp < 0.7) return { form, aim: move(k, rec, 'c') };                    // drink its own
      return { form };
    }
    if (me.charId === 'melee') {
      // RONIN wakes on a perfect parry at a full chain (the parry, above): nothing to press for it
      if (!(me.roninT > 0)) return {};
      if (me.roninIntro && !me.roninIntro.cut) return { form: 'busy' };
      const cd = me.roninCd || [0, 0, 0, 0], ch = me.roninChain;
      if (!ready) return {};
      if (!me.roninVowUsed && hp <= VOW_HP) return { aim: move(k, rec, 'v') };                                      // the last resort
      // a blow on its way and the parry not ready for it: STILL WATER takes it
      if (cd[2] <= 0 && inc && inc.t < 0.4 && (me.parryCd > 0 || me.parryT > 0)) return { aim: move(k, rec, 'c', [v.fx, v.fy]) };
      // the cleave wounds; the dash, right after it (a chain: Z then X), cuts through what it wounded
      if (cd[0] <= 0 && v.d < LUNAR_RANGE - 20) {
        const aim = move(k, rec, 'z', ahead(v, 0.1));
        if (cd[1] <= 0 && v.d < SKY_RANGE + 80 && B.skill >= 0.4) rec.press.push('x');   // held, it fires as the cleave ends
        return { aim };
      }
      if ((cd[1] <= 0 || (ch && ch.used && ch.used.includes(1))) && v.d > SKY_MIN && v.d < SKY_RANGE + 60) {
        const dx = v.fx - me.x, dy = v.fy - me.y, d = v.d || 1;
        return { aim: move(k, rec, 'x', [v.fx + dx / d * 70, v.fy + dy / d * 70]) };   // through the rival, not to it
      }
      return {};
    }
    return {};
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
    // what it keeps track of from step to step: when a swing began, how fast a lance charges, how far each lance reaches
    if (foe.swingId !== B.swingId) { B.swingId = foe.swingId; B.swingSeen = k; }
    const dc = (foe.charge || 0) - B.chargePrev;
    B.chargePrev = foe.charge || 0;
    if (dc > 0) B.chargeRate = dc / STEP;
    if (!(foe.laserT > 0) && B.beamOn) B.beams++;
    B.beamOn = foe.laserT > 0;
    const reach = p => (p.laserSegs && p.laserSegs[0] ? Math.hypot(p.laserSegs[0].x2 - p.laserSegs[0].x1, p.laserSegs[0].y2 - p.laserSegs[0].y1) : 0);
    B.lanceReach = Math.max(B.lanceReach, reach(foe));
    B.myReach = Math.max(B.myReach, reach(me));
    if (choose(k, rec)) return;
    const m = typeof RUN !== 'undefined' && RUN.pvp;
    if (state !== 'play' || !m || m.phase !== 'fight' || me.down) return;

    const [fx, fy, fvx, fvy] = B.seen[0];
    const dx = fx - me.x, dy = fy - me.y, d = Math.hypot(dx, dy) || 1;
    const view = { fx, fy, fvx, fvy, d };
    const inc = incoming(me, foe, k);
    const K = kit(me, foe, k, rec, view, inc);
    if (K.form === 'busy') {                      // a move has the hull: only where it points
      const [ax, ay] = K.aim || [fx, fy];
      rec.ax = ax; rec.ay = ay;
      return;
    }
    const guarding = parry(me, k, rec, inc) || k <= B.guardTo;
    /* Building to RONIN, or under something that does not stop (a lance held
       on it): a window that caught is followed by PARRY_CD_HIT open to it, and
       a blow there breaks the chain. A dash's i-frames, timed to start as the
       window closes, cover the gap. */
    const beam = inc && inc.kind === 'beam';
    if ((focusing(me) || (beam && me.charId === 'melee' && me.awake && !(me.roninT > 0))) && me.parryT > 0 && me.parryTook > 0
        && me.parryT <= (LS.delay + 2) * STEP && me.dashCh > 0 && inc && inc.t < (LS.delay + 2) * STEP + PARRY_CD_HIT) rec.dash = true;

    let [near, far] = K.form === 'fusion' ? [40, 95] : K.form === 'root' ? [110, JAB_RANGE - 25]
      : me.weapon === 'laser' ? [110, 195] : me.weapon === 'blade' ? [40, 85] : [210, 420];
    // a gun keeps clear of a lance's or a blade's reach, the better the bot the further
    if (me.weapon === 'bullet' && !K.form && foe.weapon !== 'bullet') near = Math.max(near, lerp([170, 270], s));
    const low = me.maxHp ? me.hp / me.maxHp : 1, theirs = foe.maxHp ? foe.hp / foe.maxHp : 1;
    const pressing = s >= BRAIN.press && theirs <= BRAIN.pressAt && low > theirs;
    // a riposte in hand, or a chain worth keeping: in close, where the blows are
    const keen = me.charId === 'melee' && (me.riposte > 0 || (me.awake && !(me.roninT > 0) && (me.chain || 0) >= CHAIN_MAX - 3));
    if (pressing || keen) { near *= 0.6; far *= 0.75; }
    else if (s >= BRAIN.retreat && low < 0.3 && me.weapon !== 'blade' && !K.form) { near += 120; far += 140; }

    // circling: one way, then the other
    if (k >= B.turnAt) { B.turn = R() < 0.5 ? -B.turn : B.turn; B.turnAt = k + Math.round(60 * (1 + R() * 2.6)); }
    const close = d > far ? 1 : d < near ? -1 : 0.12 * B.turn;
    let vx = close * dx / d - B.turn * 0.85 * dy / d, vy = close * dy / d + B.turn * 0.85 * dx / d;

    /* Something coming that it is not parrying: a round sidestepped, a beam's
       line left, a swing backed out of (judged once a blow, so it never just
       rolls until it dodges). */
    if (inc && !guarding && me.charId !== 'melee') {
      let j = B.judged.get(inc.key);
      if (j === undefined) { j = R() < lerp(BRAIN.dodge, s); if (B.judged.size > 256) B.judged.clear(); B.judged.set(inc.key, j); }
      if (j === true) {
        const src = inc.src;
        if (inc.kind === 'shot' || inc.kind === 'beam') {
          // across the round's path, or out of the lance's line
          const svx = inc.kind === 'shot' ? src.vx : Math.cos(src.ang || 0), svy = inc.kind === 'shot' ? src.vy : Math.sin(src.ang || 0);
          const sp = Math.hypot(svx, svy) || 1, side = (me.x - src.x) * svy - (me.y - src.y) * svx >= 0 ? 1 : -1;
          vx = side * svy / sp * 1.6 + vx * 0.3; vy = -side * svx / sp * 1.6 + vy * 0.3;
        } else {
          // a swing or a body: away from it
          const ox = me.x - src.x, oy = me.y - src.y, od = Math.hypot(ox, oy) || 1;
          vx = ox / od * 1.6 + vx * 0.3; vy = oy / od * 1.6 + vy * 0.3;
        }
        if (s >= BRAIN.dashDodge && inc.t < 0.22 && me.dashCh > 0) rec.dash = true;
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
    /* A parry is read off the round against the hull's own heading, so while
       one is on its way the heading holds: turning under it would make the
       reading a lie (a round taken for a miss that lands, or a guard raised
       at one that passes). */
    if (me.charId === 'melee' && inc && inc.kind === 'shot' && inc.t < BRAIN.steady) B.steadyTo = k + Math.ceil(inc.t / STEP) + LS.delay + 1;
    if (k <= B.steadyTo) { rec.mx = B.mx; rec.my = B.my; }
    B.mx = rec.mx; B.my = rec.my;
    // a blade dashes in
    if (me.weapon === 'blade' && d > 180 && d < 420 && me.dashCh > 0 && R() < 0.03 * s) rec.dash = true;

    // aim: a move's own point; the guard on the rival, exactly; else what of the room is in its face, else the rival, led and a little off
    const e = guarding || K.aim ? null : pest(me, d);
    let ax = fx, ay = fy, tvx = fvx, tvy = fvy;
    if (e) { ax = e.x; ay = e.y; tvx = e.vx || 0; tvy = e.vy || 0; }
    const td = Math.hypot(ax - me.x, ay - me.y);
    const lead = me.weapon === 'bullet' ? td / (me.bspeed || 700) * lerp(BRAIN.lead, s) : 0;
    const wob = guarding ? 0 : lerp(BRAIN.wobble, s);
    rec.ax = ax + tvx * lead + Math.sin(k * 0.071 + B.ph) * wob;
    rec.ay = ay + tvy * lead + Math.cos(k * 0.053 + B.ph * 1.7) * wob;
    if (guarding) { rec.ax = foe.x; rec.ay = foe.y; }
    if (K.aim) { rec.ax = K.aim[0]; rec.ay = K.aim[1]; }

    // the trigger: held most of the time, the better the bot the more; a riposte goes the moment it can land
    if (k >= B.fireAt) { B.fireOn = R() < lerp(BRAIN.trigger, s); B.fireAt = k + 18 + Math.floor(R() * 42); }
    const reachT = me.weapon === 'blade' ? 150 : me.weapon === 'laser' ? 320 : K.form === 'root' ? JAB_RANGE : 700;
    const riposte = me.charId === 'melee' && me.riposte > 0 && d < (me.r || 12) + BLADE_REACH + FIN_REACH + 6;
    rec.trig = rec.lmb = riposte || ((B.fireOn || pressing || !!K.form) && (td < reachT || !!e));
    if (K.form === 'fusion') rec.auto = true;     // FUSION CORE's stars go one a click, or steadily on autofire
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
  async function q(body, keepalive) {
    try {
      const r = await fetch('/api/pvp/queue', { method: 'POST', cache: 'no-store', credentials: 'same-origin', keepalive: !!keepalive,
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
  /* The rating's side of it (ranked). The start, so the queue keeps this
     match; its end, told until the queue has it; or the player walking out,
     a loss, said as the page goes (keepalive outlives it). */
  const botCall = (as, extra, keep) => q(Object.assign({ op: 'bot', queue: B.search.queue, tab: B.search.tab, id: B.spec.id, as }, extra), keep);
  async function rate(score) {
    B.over = true;
    let r = null;
    for (let i = 0; i < 4; i++) {
      r = await botCall('over', { score }, true);
      if (r.ok || (r.status && r.status !== 503 && r.status !== 429)) break;     // asked again only when it could not be written
      await new Promise(res => setTimeout(res, 1500));
    }
    return r && r.ok && r.d && r.d.rated ? r.d.rating || null : null;
  }
  function walkOut() {
    if (!B.rated || B.over || B.done || (B.search && B.search.found)) return;
    B.over = true;
    botCall('quit', {}, true);
  }

  /* Back to the lobby, still searching: the ticket, and the bot it's done
     with, so the lobby carries on where this left off. Mid-match, in ranked,
     that is walking out: a loss. */
  function back() {
    if (M.leaving) return;
    walkOut();
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

  /* What kind of match, for the belt and the result (art.js): a bot's, rated
     in ranked once the queue has said so, in the player's league once placed. */
  const versus = M.versus;
  M.versus = () => {
    const v = versus();
    if (!botting()) return v;
    const lg = M.hand.me && M.hand.me.league;
    return Object.assign(v, { queue: 'bot', rated: B.rated, league: B.rated && lg && !lg.provisional && lg.id ? { id: lg.id, n: lg.n } : null });
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
    const me = pilotMine(), won = m.winner === me, score = [m.score[me], m.score[1 - me]];
    const r = M.scene ? M.scene(won ? 'won' : 'lost') : null;
    if (r) M.shown = { at: Date.now(), r };
    state = 'pvp';
    const title = (won ? 'VICTORY  ' : 'DEFEAT  ') + score[0] + ' — ' + score[1];
    overlay(title);
    /* Unrated (casual): said at once, NOT RECORDED. Rated: the queue is told,
       and its answer is the rating, rolling on the result (art.js); a match
       it would not rate says NOT RECORDED after all. */
    if (!B.rated) { if (r) r.verdict = { v: 'bot', won }; return; }
    rate(score).then(told => {
      if (r) {
        r.verdict = told ? { v: 'played', won } : { v: 'bot', won };
        r.rating = told;
        if (!told) Object.assign(r, { rated: false, league: null });
      }
      if (told && B.box) B.box.querySelector('h2').textContent = title + '   ·   ' + told.before + ' → ' + told.after;
    });
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
      // ranked: the queue keeps this match, to rate it (or casual's: it says it doesn't)
      if (B.search && spec.id) botCall('start').then(r => { if (r.ok && r.d && r.d.rated) B.rated = true; });
      /* Closing the tab: walking out of a rated match, a loss; and the ticket
         goes with it, so nobody is paired with a page that's gone. */
      addEventListener('pagehide', () => {
        const S = B.search;
        if (!S || B.handing) return;
        walkOut();
        if (S.on) q({ op: 'leave', queue: S.queue, tab: S.tab }, true);
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
