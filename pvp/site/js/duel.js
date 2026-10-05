/* ===========================================================================
   VOIDRUNNER PvP — the fight between two pilots (PVP-PLAN.md, Phase 3 step 3)

   Every weapon and ability in the game hurts the other pilot, without any of
   them being taught to: each pilot has a STAND-IN, an invisible body in the
   game's enemies list. Whatever a pilot's shots, blasts, beams, blades, kit
   moves, drones, fields or army do to enemies, they do to the other pilot's
   stand-in, and at the one line where the engine would take health off a
   body (damageEnemy) the hit comes here instead (VR_PVP.hit). Everything the
   engine works out before that line still applies: crits, the attacker's
   damage upgrades, a mark like RONIN's DEEP WOUND or a Brand. Here it becomes
   damage to the pilot: scaled to a pilot (an enemy has far more health) and
   capped, so that no single hit, and no burst within a second, can decide a
   round by itself (DUEL).

   A pilot never hits its own stand-in. While a pilot's code runs (its turn:
   VR_PVP.turn, which the engine's pilotsEach and pilotDo call), its own
   stand-in waits far off the map and the other one sits on the other pilot.
   What the world runs on a pilot's behalf after its turn (the bodies its army
   took, its napalm, its mortars, its volatile wrecks) runs as that pilot too
   (VR_PVP.as, with the owner each records when it is made: VR_PVP.owner).
   Outside any turn both stand-ins wait off the map, so the room's own enemies
   and blasts never touch them; those hurt pilots the game's own way.

   Burns, poison and leaks on a stand-in tick here (dots), because the
   engine's enemy loop passes stand-ins by: they are not bodies.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  /* The balance. A pilot's damage against an enemy, times `scale`, is its
     damage against a pilot: base VOIDRUNNER (11 a shot, 4.6 a second) takes a
     100-health pilot down in about nine seconds of hits. */
  const DUEL = M.DUEL = {
    scale: 0.22,       // a hit on an enemy, as a hit on a pilot
    hitCap: 0.14,      // no single hit takes more than this share of the pilot's max health
    burstCap: 0.34,    // nor more than this share within any one second, whatever lands
    window: 1,         // that second
    mercy: 0.05,       // the i-frames a pilot's hit grants (an enemy's grant the game's 0.62)
    killHit: 0.14,     // what an execution or a delete lands instead, as a share of max health
    pilots: { runner: 1, ember: 1, hacker: 1, melee: 1 }   // each pilot's damage, for tuning (below)
  };
  const FAR = -1e5;

  // the match's state lives in RUN.pvp (rounds.js), where run snapshots carry it
  const match = () => (typeof RUN !== 'undefined' && RUN.pvp) || null;

  /* ------------------------------ whose turn ------------------------------ */
  const stack = [];
  let world = null;
  M.owner = () => (stack.length ? stack[stack.length - 1] : world);
  M.turn = (k, fn) => {
    stack.push(k);
    place();
    try { return fn(); } finally { stack.pop(); place(); }
  };
  // the world, acting for a pilot (or for nobody): that pilot flies while it does
  M.as = owner => {
    world = owner == null ? null : owner;
    if (PILOTS.length > 1) pilotUse(world == null ? 0 : world);
    place();
  };

  /* ------------------------------ the stand-ins --------------------------- */
  let cache = { arr: null, n: -1, tick: -1, list: [] };
  function standIns() {
    if (cache.arr !== enemies || cache.n !== enemies.length || cache.tick !== simTick) {
      const list = [];
      for (const e of enemies) if (e.pvpPilot != null) list.push(e);
      cache = { arr: enemies, n: enemies.length, tick: simTick, list };
    }
    return cache.list;
  }
  M.standIns = standIns;

  // where each stand-in is: on its pilot for whoever is acting against it, else nowhere
  function place() {
    if (!match() || PILOTS.length < 2) return;
    const k = M.owner();
    for (const s of standIns()) {
      const p = pilotP(s.pvpPilot);
      const show = k != null && s.pvpPilot !== k && p && !p.down;
      s.x = show ? p.x : FAR;
      s.y = show ? p.y : FAR;
      if (p) s.r = p.r;
    }
  }
  M.place = place;

  // a fresh pair for each round: nothing the last one carried (burns, wounds, brands)
  M.newStandIns = () => {
    for (let i = enemies.length - 1; i >= 0; i--) if (enemies[i].pvpPilot != null) enemies.splice(i, 1);
    for (let k = 0; k < 2; k++) {
      const e = spawnEnemy('grunt', FAR, FAR, { elite: false });
      e.pvpPilot = k;
      e.hp = e.maxHp = 1e9;
      e.spd = 0; e.dmg = 0; e.xp = 0; e.score = 0;
    }
    cache.tick = -1;
  };

  /* ---------------------------------- hits -------------------------------- */
  /* A stand-in struck: from whoever's turn it is, never from its own pilot.
     The room can never strike one (it is off the map whenever the room acts),
     so a blow the game marks as a body's (`enemy`) is THE HACKER's army: its
     contact, its fire. Those count. */
  M.hit = (e, dmg) => {
    const by = M.owner();
    if (by == null || by === e.pvpPilot) return;
    land(e.pvpPilot, dmg, by);
  };
  // something that would simply kill a body (an execution, a delete) lands a capped blow instead
  M.kill = e => {
    const by = M.owner();
    if (by == null || by === e.pvpPilot) return;
    const p = pilotP(e.pvpPilot);
    if (p) land(e.pvpPilot, (DUEL.killHit * p.maxHp) / DUEL.scale, by);
  };

  /* A pilot from outside the game's file may bring its own rules to a duel
     (its def.duel, OUTSIDE PILOTS in the engine): `deal` for its blows,
     `take` for the blows it takes. Each `scale` multiplies DUEL's; on the
     caps the one taking a blow has the say, then the one dealing it, then
     DUEL. */
  const duelRule = (pilot, side) => {
    const c = pilot && CHARS.find(x => x.id === pilot.charId);
    return (c && c.outside && c.duel && c.duel[side]) || {};
  };

  /* A pilot's hit on another, `raw` in the game's own figures. Through
     hurtPlayer, so a parry, a dash's i-frames, STILL WATER and a shield all
     answer it as they answer anything, and the victim's own build (armour,
     frailty) counts; the caps are handed in with it and hold after all that.
     Returns what it took. */
  function land(victim, raw, by) {
    const m = match();
    if (!m || m.phase !== 'fight') return 0;
    const p = pilotP(victim), a = pilotP(by);
    if (!p || p.down) return 0;
    const dl = duelRule(a, 'deal'), tk = duelRule(p, 'take');
    const hitCap = tk.hitCap ?? dl.hitCap ?? DUEL.hitCap, burstCap = tk.burstCap ?? dl.burstCap ?? DUEL.burstCap;
    const scale = DUEL.scale * (dl.scale ?? 1) * (tk.scale ?? 1);
    const recent = m.hits[victim];
    while (recent.length && recent[0][0] <= m.clock - DUEL.window) recent.shift();
    let took = 0;
    for (const h of recent) took += h[1];
    const cap = Math.min(hitCap * p.maxHp, burstCap * p.maxHp - took);
    const d = Math.min(raw * scale * (DUEL.pilots[a && a.charId] || 1), cap);
    if (!(d > 0.05)) return 0;
    /* A body of THE HACKER's army hits from inside its script, and the game
       lets nothing a script makes reach a pilot (hackBy, its own guard against
       hurting yourself). Here the pilot is the other one: let it through.
       What it took is hurtPlayer's word, not the health before and after: a
       killing blow that Second Wind or a DEADMAN BRAKE answers still took all
       the pilot had, though the pilot stands up again with more. */
    const script = hackBy;
    let dealt = 0;
    hackBy = null;
    try { dealt = pilotDo(victim, () => hurtPlayer(d, { pvp: { mercy: DUEL.mercy, armor: DUEL.scale, cap } })) || 0; }
    finally { hackBy = script; }
    if (dealt > 0) {
      recent.push([m.clock, dealt]);
      if (m.dealt) m.dealt[by] += dealt;           // for the result screen
    }
    return dealt;
  }
  M.land = land;

  /* Burns, poison and leaks on a stand-in, ticked at the engine's own rates
     (updateEnemies) as the pilot who put them there: the other one. */
  M.dots = dt => {
    for (const s of standIns()) {
      const v = s.pvpPilot, by = 1 - v, a = pilotP(by), p = pilotP(v);
      if (!a || !p) continue;
      if (s.burn > 0) {
        s.burnT -= dt;
        s.burnTick = (s.burnTick || 0) - dt;
        if (s.burnTick <= 0) { s.burnTick = BURN_TICK; land(v, (2 + a.dmg * 0.11) * s.burn, by); }
        if (s.burnT <= 0) s.burn = 0;
      }
      if (s.psn > 0) {
        s.psnT -= dt;
        s.psnTick = (s.psnTick || 0) - dt;
        if (s.psnTick <= 0) { s.psnTick = 0.5; land(v, (1.5 + a.dmg * 0.09) * s.psn, by); }
        if (s.psnT <= 0) s.psn = 0;
      }
      if (s.leakT > 0) {
        s.leakT -= dt;
        land(v, p.maxHp * s.leak * dt, by);        // a share of the pilot's health, not the stand-in's
        if (s.leakT <= 0) s.leak = 0;
      }
    }
  };
})();
