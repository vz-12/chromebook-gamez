/* ===========================================================================
   VOIDRUNNER PvP — the match (PVP-PLAN.md, Phase 3 step 3)

   How a match runs, start to finish, inside the shared simulation: every
   step of it happens on both machines at the same step, from the same seed
   and the same inputs (LOCKSTEP CO-OP), and its whole state is RUN.pvp, which
   the run's snapshots carry.

     belt     the map is drawn: the belt spins (art.js), on PvP's own screen
     picks    upgrades are dealt: three each to start; one to whoever lost
              the last round; the room holds while they choose
     fight    a round: both pilots from their own side at full health. Every
              thirty seconds of fighting deals each of them another upgrade.
              A round still on at OVERTIME.at goes to overtime (below)
     end      a pilot is down: the round goes to the other. A moment, then
              the next round's picks, or
     over     the match: best of three until gold, best of five from there

   The upgrades stay from round to round; health, the floor, the walls and the
   room start fresh.

   OVERTIME (the pace of a fight, PVP-PLAN.md). Two pilots who keep their
   distance and dodge well can trade near misses for minutes: measured, gun
   against gun ran rounds of two to five minutes, the pilots 250 px and more
   apart nearly all of it. So a round has a clock. Past OVERTIME.at seconds:
     · the walls close in on the middle, at a steady pace over OVERTIME.close
       seconds, to a box OVERTIME.w by OVERTIME.h, where there is no keeping
       away (and no room for the room to send anything more: maps.js)
     · the blows the pilots trade grow by OVERTIME.ramp a second (M.surge,
       which duel.js applies), the duel's caps holding all the same, so the
       round still cannot end in one blow
     · nothing is won back: a pilot's health only falls (regeneration, a
       heal, a revive's health all held at what it had), and a shield spent
       stays spent
   The HUD counts the last OVERTIME.warn seconds down, and the result marks
   a round that went to overtime. scripts/pvp-pace.mjs measures all of it.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  const ROUNDS = M.ROUNDS = {
    beltT: 4.8,          // the belt's seconds
    endT: 2.6,           // between a pilot going down and what comes next
    startPicks: 3,       // upgrades each pilot starts a match with
    pickEvery: 30,       // seconds of fighting per upgrade, for both
    loserPicks: 1,       // and one more for whoever lost the round
    spawnIframe: 1.5,    // a round's opening grace
    spawnAt: 0.32,       // how far out from the middle each side starts, as a share of the arena's width
    adBonus: 2           // what a watched ad adds to a friend match's start (the lobby's ads.js): exactly this, or nothing
  };
  const OVERTIME = M.OVERTIME = {
    at: 40,              // seconds into a round before it goes to overtime
    warn: 10,            // the HUD counts this many down before it does
    close: 20,           // seconds the walls take to close in
    w: 480, h: 320,      // the box they close to (the arena is maps.js's ARENA): no keeping away in it
    ramp: 0.08,          // the blows between pilots: this much more a second of overtime (x2.6 once the walls are in)
    oneRound: false      // a hidden pilot's one long round (bestOf 1) goes to overtime too, if true
  };
  const PHASES = ['belt', 'picks', 'fight', 'end', 'over'];

  const match = () => (typeof RUN !== 'undefined' && RUN.pvp) || null;
  // a match: played, watched (watch.js), whose copy of the game plays the very same one, or against a bot (bot.js)
  const matchy = () => !!(M.hand && (M.hand.mode === 'match' || M.hand.mode === 'watch' || M.hand.mode === 'bot'));
  const inMatch = () => matchy() && PILOTS.length > 1 && LS.on;

  /* The ad suggestion's bonus (PVP-PLAN.md, Phase 6 step 3): a friend's
     match only (a queued one carries a server's match, M.hand.match, and
     never a bonus), and only exactly ROUNDS.adBonus. Each machine says its
     own in the hello, so both deal the same opening picks (lockstep). */
  const friendly = () => matchy() && !M.hand.match;
  const ownBonus = () => (friendly() && M.hand.bonus === ROUNDS.adBonus ? ROUNDS.adBonus : 0);
  // a friend's match as the story fight, a rehearsal of it: the host's word (the lobby's STORY box), said in its hello
  const ownStory = () => friendly() && M.hand.story === true;
  const hello = M.hello, peerHello = M.peerHello;
  M.hello = () => Object.assign(hello(), { bonus: ownBonus(), story: ownStory() });
  M.peerHello = d => {
    peerHello(d);
    M.peerBonus = friendly() && d && d.bonus === ROUNDS.adBonus ? ROUNDS.adBonus : 0;
    M.peerStory = friendly() && !!d && d.story === true;
  };
  // pilot k's bonus, the same on both machines
  M.bonusOf = k => (k === pilotMine() ? ownBonus() : (M.peerBonus || 0));
  /* Best of three below gold, five from there: a ranked match plays to its
     league's length (the lower league's, when two meet), as the server's
     match says, so both machines play the same match; against a hidden pilot
     it is one long round. A match with a friend, or a casual one, is best of
     three. */
  M.bestOf = () => {
    if (M.story()) return 1;
    const b = M.hand && M.hand.match && M.hand.match.bestOf;
    return b === 5 || b === 1 ? b : 3;
  };
  /* The story fight (a hidden pilot's script: its kit reads RUN.pvp.story):
     the match the queue makes with the one a challenge went to, which the
     server marks (pvp/src/objects.js), or practice against a bot that the
     lobby starts for a hidden pilot's holder (bot.js), which may begin at a
     later phase (storyFrom, 1 to 4), or a friend's match its host asks to be
     one, to rehearse it (the host's hello says so, above). A viewer or a
     replay takes it from the broadcast's header (watch.js). Every machine in
     a match comes to the same answer. */
  M.story = () => {
    const h = M.hand;
    if (!h) return false;
    if (h.mode === 'watch' || h.mode === 'bot') return h.story === true;
    if (h.match) return h.match.story === true;
    return friendly() && (MP.role === 'host' ? ownStory() : M.peerStory === true);
  };
  const storyFrom = () => {
    const n = M.hand && M.hand.mode === 'bot' ? M.hand.storyFrom : 1;
    return Number.isInteger(n) && n >= 1 && n <= 4 ? n : 1;
  };
  const toWin = m => Math.ceil(m.bestOf / 2);
  // each pilot's player, by name, as this machine knows them
  M.nameOf = k => (k === pilotMine() ? (Save.profile.name || 'YOU') : (MP.peerName || 'RIVAL')).toUpperCase();

  /* ------------------------------ the phases ------------------------------ */
  // the run's first step: the match is laid out, the map drawn, the belt shown
  function begin() {
    const map = M.maps.pick();
    const m = RUN.pvp = {
      v: 1, run: LS.run, phase: 'belt', t: 0, clock: 0, nextPick: ROUNDS.pickEvery,
      round: 0, bestOf: M.bestOf(), score: [0, 0], winner: -1, loser: -1, owed: [0, 0],
      map: map.index, infested: map.infested, odds: map.odds, hackers: map.hackers,
      spawnT: 2.5, hits: [[], []],
      ot: false, held: null,   // this round gone to overtime, and each pilot's health held there (OVERTIME)
      log: [],              // each round as it ends: { w: its winner, at: the match clock, left: the winner's health, 0 to 1, ot: in overtime }
      dealt: [0, 0],        // the health each pilot has taken off the other (duel.js), for the result screen
      story: M.story(), storyFrom: storyFrom()   // the story fight, and the phase it opens on (above)
    };
    /* A run never fights at wave 0: its first wave is 1. The game's curves
       start there too, and below it an enemy is born with negative health
       (hpCurve), dead the moment anything touches it, THE HACKER's take
       included. A match is fought at wave 1, and stays there. */
    wave = 1;
    M.maps.apply(m);
    M.newStandIns();
    toSides();
    state = 'pvp';
  }

  // both pilots on their own side of the middle, facing each other
  function toSides() {
    const cx = (arena.x0 + arena.x1) / 2, cy = (arena.y0 + arena.y1) / 2;
    const off = (arena.x1 - arena.x0) * ROUNDS.spawnAt;
    pilotsEach(() => {
      const side = P.pid === 0 ? -1 : 1;
      P.x = cx + side * off; P.y = cy;
      P.vx = 0; P.vy = 0;
      P.ang = side < 0 ? 0 : Math.PI;
    });
    if (PILOT.on === pilotMine()) { cam.x = P.x; cam.y = P.y; }
  }

  /* ------------------------------- overtime ------------------------------- */
  // a round with a clock: every one, but a hidden pilot's one long round only if OVERTIME.oneRound
  const clocked = m => !!m && (m.bestOf !== 1 || OVERTIME.oneRound);
  M.overtime = m => { m = m || match(); return !!m && m.phase === 'fight' && clocked(m) && m.t >= OVERTIME.at; };
  const otT = m => (M.overtime(m) ? m.t - OVERTIME.at : 0);
  // what a blow between the pilots is worth (duel.js): as it is, and in overtime more by the second
  M.surge = () => 1 + OVERTIME.ramp * otT(match());

  // the walls: the arena's box (maps.js) closing on the middle at a steady pace, to OVERTIME's
  function squeeze(m) {
    const A = M.maps.ARENA, k = Math.min(1, otT(m) / OVERTIME.close);
    arenaShrinkTo(WORLD.w / 2, WORLD.h / 2, A.w + (OVERTIME.w - A.w) * k, A.h + (OVERTIME.h - A.h) * k);
  }
  /* Nothing won back: each pilot's health is held at the lowest it has been
     since overtime began, whatever would raise it (regeneration, a heal, a
     card, the health a revive stands it up with), and a spent shield is not
     regrown. The world's turn comes before the pilots' in a step, so what a
     step adds is taken back at the next one, never kept. */
  function hold(m) {
    if (!m.held) m.held = [pilotP(0).hp, pilotP(1).hp];
    for (let k = 0; k < 2; k++) {
      const p = pilotP(k);
      if (!p || p.down) continue;
      if (p.hp < m.held[k]) m.held[k] = p.hp;
      else p.hp = m.held[k];
      if (p.shieldMax && p.shield < p.shieldMax) p.shieldT = 0;
    }
  }

  // a round: the room and both pilots fresh, the builds kept
  function startRound(m) {
    m.round++;
    m.phase = 'fight'; m.t = 0; m.winner = -1; m.loser = -1; m.spawnT = 2.5;
    m.ot = false; m.held = null;
    M.maps.open();                       // the walls back where they were
    m.hits = [[], []];
    bullets.length = 0; ebullets.length = 0; mortars.length = 0; beams.length = 0;
    corpses.length = 0; gems.length = 0; drops.length = 0; hazards.length = 0;
    enemies.length = 0;                  // the room's own and both armies; the stand-ins are made again
    M.newStandIns();
    toSides();
    pilotsEach(() => {
      sentries.length = 0;
      P.down = false; P.hp = P.maxHp; P.iframe = ROUNDS.spawnIframe; P.hurtFlash = 0;
      P.dashCh = P.dashMax; P.dashT = 0; P.dashRe = 0; P.ghosts.length = 0;
      P.laserT = 0; P.laserSegs.length = 0; P.charge = 0; P.swingT = 0; P.slowT = 0;
      P.shield = P.shieldMax || 0;
      /* A form woken last round (OVERDRIVE, SUPERUSER, RONIN, IMAGO: a minute
         each) ends with that round, so nobody starts one transformed:
         measured, a form carried over ended the next round in five seconds.
         Its clock is left a moment, and the engine ends it its own way next
         step (IMAGO's cut-in, if it was still playing, is cut short too, as
         the minute does not run under it). A meter still filling carries
         over, like the build. */
      if (P.ventT > 0) P.ventT = 1e-6;
      if (P.suT > 0) P.suT = 1e-6;
      if (P.roninT > 0) P.roninT = 1e-6;
      if (P.imT > 0) { P.imT = 1e-6; P.imIntro = null; }
    });
    banner('ROUND ' + m.round + '   ·   FIGHT', '#f472b6', 2.0);
  }

  // a step of a match, in play (updateWaves: the world's turn)
  function tick(dt) {
    let m = match();
    if (!m || m.run !== LS.run) {
      if (inMatch()) begin();
      return;
    }
    if (m.phase === 'picks') {
      let choosing = false;
      pilotsEach(() => { if (offers.length || gearOffer) choosing = true; });
      if (!choosing && m.owed[0] <= 0 && m.owed[1] <= 0) startRound(m);
      return;
    }
    if (m.phase === 'fight') {
      m.t += dt; m.clock += dt;
      if (m.clock >= m.nextPick) {
        m.nextPick += ROUNDS.pickEvery;
        m.owed[0]++; m.owed[1]++;
        banner('UPGRADE', '#fde047', 1.4);
      }
      if (M.overtime(m)) {
        if (!m.ot) { m.ot = true; banner('OVERTIME   ·   THE WALLS CLOSE', '#f87171', 2.4); }
        squeeze(m);
        hold(m);
      }
      M.dots(dt);
      M.maps.spawn(m, dt);
      return;
    }
    if (m.phase === 'end') {
      m.t += dt;
      if (m.t < ROUNDS.endT) return;
      if (m.score[m.winner] >= toWin(m)) { m.phase = 'over'; m.t = 0; state = 'pvp'; return; }
      m.owed[m.loser] += ROUNDS.loserPicks;
      m.phase = 'picks'; m.t = 0;
    }
  }

  // a step on PvP's own screen (the engine's 'pvp' state): the belt runs out
  M.idle = dt => {
    const m = match();
    if (!m || m.run !== LS.run || m.phase !== 'belt') return;
    m.t += dt;
    if (m.t < ROUNDS.beltT) return;
    m.phase = 'picks'; m.t = 0;
    m.bonus = [M.bonusOf(0), M.bonusOf(1)];          // a watched ad's, in a friend's match
    m.owed = [ROUNDS.startPicks + m.bonus[0], ROUNDS.startPicks + m.bonus[1]];
    state = 'play';
    banner('CHOOSE ' + m.owed[pilotMine()] + ' UPGRADES', '#fde047', 2.2);
  };

  /* A pilot out of health (reviveOrDie, as that pilot, after Second Wind and
     DEADMAN BRAKE have had their say). In a round, it is the round. Out of
     one, nothing can finish a pilot off. */
  M.down = () => {
    const m = match();
    if (!m) return false;
    if (m.phase !== 'fight') { P.hp = Math.max(1, P.hp); return true; }
    P.hp = 0; P.down = true;
    P.vx = 0; P.vy = 0; P.dashT = 0; P.laserT = 0; P.laserSegs.length = 0; P.charge = 0; P.swingT = 0;
    burst(P.x, P.y, 52, COL.player, 360, 4, 1.0);
    ringFx(P.x, P.y, 8, 220, COL.player, 0.7, 5);
    drawFlashT = 0.14; shake(0.8);
    m.loser = P.pid; m.winner = 1 - P.pid;
    m.score[m.winner]++;
    m.phase = 'end'; m.t = 0;
    const w = pilotP(m.winner);
    if (m.log) m.log.push({ w: m.winner, at: m.clock, left: w && w.maxHp ? Math.max(0, w.hp) / w.maxHp : 0, ot: !!m.ot });
    if (w) w.iframe = Math.max(w.iframe, ROUNDS.endT + 1);   // nothing the room does now takes the round back
    const over = m.score[m.winner] >= toWin(m);
    banner((over ? 'MATCH TO ' : 'ROUND TO ') + M.nameOf(m.winner), m.winner === pilotMine() ? '#86efac' : '#f87171', ROUNDS.endT);
    return true;
  };

  /* checkLevel: in a match, a level is paid only when one is owed, one at a
     time; experience from anything else is let go. */
  M.levelUp = p => {
    const m = match();
    if (!m) return true;
    if (!(m.owed[p.pid] > 0)) return false;
    m.owed[p.pid]--;
    p.xp = p.xpNext;
    return true;
  };

  // a match's step, for match.js's `waves` (the world's turn, in play)
  M.rounds = { tick };

  // lockstep's fingerprint: the match, as well as the bodies and the pilots
  M.hash = n => {
    const m = match();
    if (!m) return;
    n(PHASES.indexOf(m.phase)); n(m.round); n(m.score[0]); n(m.score[1]); n(m.owed[0]); n(m.owed[1]); n(m.clock); n(m.ot ? 1 : 0);
  };

  /* -------------------------------- drawing ------------------------------- */
  /* PvP's own screen (the engine's 'pvp' state), drawn by art.js's hooks:
     the result once a match is over or left (match.js sets M.shown), the belt
     while the map is drawn, or either with sample data on /play/?preview=
     (preview.js sets M.preview). A hook that throws is logged once. */
  const artErr = new Set();
  function paint(hook, t, d) {
    if (!window.PVP_ART || typeof PVP_ART[hook] !== 'function') return false;
    ctx.save();
    try { PVP_ART[hook](ctx, W, H, t, d); }
    catch (e) { if (!artErr.has(hook)) { artErr.add(hook); console.error('PVP_ART.' + hook, e); } }
    ctx.restore();
    return true;
  }
  // what the belt is handed (art.js): the draw, and who is fighting (match.js, M.versus)
  M.beltData = m => Object.assign({ dur: ROUNDS.beltT }, M.maps.belt(m), M.versus ? M.versus() : null);
  M.draw = () => {
    const since = s => (Date.now() - s.at) / 1000;
    if (M.shown && paint('result', since(M.shown), M.shown.r)) return;
    if (M.preview && M.preview.belt) { paint('belt', since(M.preview), M.preview.belt); return; }
    const m = match();
    if (m && m.phase === 'belt') paint('belt', m.t, M.beltData(m));
  };

  /* The HUD's right-hand column, where a run shows its score: the round, the
     score, the next upgrade and the map. */
  M.hud = () => {
    const m = match();
    if (!m) return false;
    const pad = 18, x = W - pad, rMax = Math.max(96, W * 0.4);
    const me = pilotMine(), them = 1 - me;
    ctx.save();
    ctx.textAlign = 'right';
    ctx.letterSpacing = '0.06em';
    const score = m.score[me] + '  —  ' + m.score[them];
    fitFont(score, rMax, '800', 27, "'JetBrains Mono', ui-monospace, monospace", 13);
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(score, x, pad + 12);
    ctx.letterSpacing = '0.12em';
    const who = M.nameOf(me) + '  ·  ' + M.nameOf(them);
    fitFont(who, rMax, '600', 10, "Barlow, 'Segoe UI', system-ui, sans-serif", 8);
    ctx.fillStyle = '#5b6b82';
    ctx.fillText(who, x, pad + 31);
    const round = m.phase === 'picks' ? 'CHOOSING UPGRADES'
      : (m.bestOf === 1 ? 'ONE ROUND' : 'ROUND ' + Math.max(1, m.round) + '   ·   FIRST TO ' + toWin(m))
        + (m.phase === 'fight' ? '   ·   UPGRADE IN ' + Math.max(0, Math.ceil(m.nextPick - m.clock)) + 'S' : '');
    fitFont(round, rMax, '600', 11, "Barlow, 'Segoe UI', system-ui, sans-serif", 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(round, x, pad + 50);
    const map = M.maps.list()[m.map];
    const where = (map ? map.name : '') + '   ·   ' + (m.infested ? 'INFESTED' : 'CLEAN');
    fitFont(where, rMax, '600', 12, "'Chakra Petch', Barlow, system-ui, sans-serif", 8);
    ctx.fillStyle = m.infested ? '#f87171' : (map ? map.accent : '#67e8f9');
    ctx.fillText(where, x, pad + 70);
    // the round's clock: its last seconds counted down, then overtime and what a blow is worth now
    const left = OVERTIME.at - m.t, over = M.overtime(m);
    const clock = over ? 'OVERTIME   ·   BLOWS ×' + M.surge().toFixed(1) + '   ·   NO HEALING'
      : m.phase === 'fight' && clocked(m) && left <= OVERTIME.warn ? 'OVERTIME IN ' + Math.max(1, Math.ceil(left)) + 'S' : '';
    if (clock) {
      fitFont(clock, rMax, '800', 12, "'Chakra Petch', Barlow, system-ui, sans-serif", 8);
      ctx.fillStyle = over ? '#f87171' : '#fca5a5';
      ctx.globalAlpha = over ? 0.75 + 0.25 * Math.sin(uiTime * 6) : 1;
      ctx.fillText(clock, x, pad + 90);
    }
    ctx.restore();
    return true;
  };

  /* Overtime's walls, in the world, over the arena's own (the engine's
     drawArena, under everything that moves): red and beating, and the floor
     they have closed off darkened. */
  M.arena = () => {
    const m = match();
    if (!m || !M.overtime(m)) return;
    const x0 = arena.x0, y0 = arena.y0, w = arena.x1 - arena.x0, h = arena.y1 - arena.y0, far = 4000;
    const beat = 0.6 + 0.4 * Math.sin(uiTime * 6);
    ctx.save();
    ctx.fillStyle = 'rgba(60,6,12,0.45)';
    ctx.beginPath();
    ctx.rect(x0 - far, y0 - far, w + far * 2, h + far * 2);
    ctx.rect(x0, y0, w, h);
    ctx.fill('evenodd');
    ctx.strokeStyle = 'rgba(220,38,38,' + (0.3 + 0.25 * beat).toFixed(3) + ')';   // over the arena's own glow, not added to it
    ctx.lineWidth = 26;
    ctx.strokeRect(x0, y0, w, h);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(254,202,202,' + (0.85 * beat).toFixed(3) + ')';
    ctx.lineWidth = 4;
    ctx.strokeRect(x0, y0, w, h);
    ctx.restore();
  };
})();
