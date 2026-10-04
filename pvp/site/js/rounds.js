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
              thirty seconds of fighting deals each of them another upgrade
     end      a pilot is down: the round goes to the other. A moment, then
              the next round's picks, or
     over     the match: best of three until gold, best of five from there

   The upgrades stay from round to round; health, the floor and the room
   start fresh.
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
    spawnAt: 0.32        // how far out from the middle each side starts, as a share of the arena's width
  };
  const PHASES = ['belt', 'picks', 'fight', 'end', 'over'];

  const match = () => (typeof RUN !== 'undefined' && RUN.pvp) || null;
  const inMatch = () => !!(M.hand && M.hand.mode === 'match' && PILOTS.length > 1 && LS.on);
  /* Best of three below gold, five from there: a ranked match plays to its
     league's length (the lower league's, when two meet), as the server's
     match says, so both machines play the same match. A match with a friend,
     or a casual one, is best of three. */
  M.bestOf = () => {
    const b = M.hand && M.hand.match && M.hand.match.bestOf;
    return b === 5 ? 5 : 3;
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
      log: [],              // each round as it ends: { w: its winner, at: the match clock, left: the winner's health, 0 to 1 }
      dealt: [0, 0]         // the health each pilot has taken off the other (duel.js), for the result screen
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

  // a round: the room and both pilots fresh, the builds kept
  function startRound(m) {
    m.round++;
    m.phase = 'fight'; m.t = 0; m.winner = -1; m.loser = -1; m.spawnT = 2.5;
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
    m.owed = [ROUNDS.startPicks, ROUNDS.startPicks];
    state = 'play';
    banner('CHOOSE ' + ROUNDS.startPicks + ' UPGRADES', '#fde047', 2.2);
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
    if (m.log) m.log.push({ w: m.winner, at: m.clock, left: w && w.maxHp ? Math.max(0, w.hp) / w.maxHp : 0 });
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
    n(PHASES.indexOf(m.phase)); n(m.round); n(m.score[0]); n(m.score[1]); n(m.owed[0]); n(m.owed[1]); n(m.clock);
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
      : 'ROUND ' + Math.max(1, m.round) + '   ·   FIRST TO ' + toWin(m)
        + (m.phase === 'fight' ? '   ·   UPGRADE IN ' + Math.max(0, Math.ceil(m.nextPick - m.clock)) + 'S' : '');
    fitFont(round, rMax, '600', 11, "Barlow, 'Segoe UI', system-ui, sans-serif", 8);
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(round, x, pad + 50);
    const map = M.maps.list()[m.map];
    const where = (map ? map.name : '') + '   ·   ' + (m.infested ? 'INFESTED' : 'CLEAN');
    fitFont(where, rMax, '600', 12, "'Chakra Petch', Barlow, system-ui, sans-serif", 8);
    ctx.fillStyle = m.infested ? '#f87171' : (map ? map.accent : '#67e8f9');
    ctx.fillText(where, x, pad + 70);
    ctx.restore();
    return true;
  };
})();
