/* ===========================================================================
   VOIDRUNNER — DEV TEST CONSOLE  (local dev only; never shipped)

   Injected INTO the local snapshot's index.html by scripts/dev.mjs. The real
   index.html in the repo is never touched, and nothing here reaches
   production — it exists only while `npm run dev` is serving.

   It is a sibling classic <script>, so it shares the page's global lexical
   scope with the engine: it reads and writes the game's own globals (state,
   P, enemies, CHARS, BOSSES, STAGES, RUN, runSet, applyChar, enterRite, …)
   by name. Every call is guarded so a missing/renamed global only logs,
   never crashes the game.

   Toggle with the ` (backtick) key, or the ⚙ button, top-right.
   Type `help` in the box for the command list.
   ========================================================================= */
(function () {
  'use strict';
  if (window.__VR_TC) return;            // never inject twice
  window.__VR_TC = true;

  /* -- direct eval: resolves engine lexical globals (let/const) by name -- */
  const G = (src) => eval(src);          // eslint-disable-line no-eval
  const has = (name) => { try { return G('typeof ' + name) !== 'undefined'; } catch (e) { return false; } };
  const get = (name) => { try { return G(name); } catch (e) { return undefined; } };
  const call = (name, ...a) => { const f = get(name); if (typeof f === 'function') return f(...a); throw new Error(name + ' is not a function'); };

  /* ------------------------------- data ------------------------------- */
  const PILOTS = [['runner', 'VOIDRUNNER'], ['ember', 'EMBER'], ['hacker', 'THE HACKER'], ['melee', 'THE VAGRANT'], ['x0', 'OUTSIDE (x0)']];
  const ROTATION = ['warden', 'forgeheart', 'broodmother', 'archivist', 'nullcore'];
  const FRACTURE = ['curator', 'theother'];
  const EVENT_BOSS = ['keeper', 'unwritten', 'amalgam', 'shopkeeper', 'root', 'backlog', 'deadgame', 'founder', 'onepointoh'];
  // bosses that have their own entry point rather than a plain spawn
  const BOSS_STARTER = {
    keeper: () => call('startKeeperFight'),
    amalgam: () => call('startAmalgam'),
    root: () => call('startRoot'),
    unwritten: () => { call('startUnwritten'); try { call('unwJump', 3); } catch (e) {} },
    onepointoh: () => call('opoOpen'),
    founder: () => call('enterRite', 'melee'),
    backlog: () => call('hlAreaStart', 'patch'),
    deadgame: () => call('hlAreaStart', 'house'),
  };
  const RITES = [['ember', 'EMBER OVERDRIVE'], ['hacker', 'SUPERUSER'], ['melee', 'THE FOUNDER'], ['runner', 'ONE POINT OH']];
  const HALLOWS = ['patch', 'house'];
  const KNOWN_FLAGS = (has('RUN_FLAGS') && Array.isArray(get('RUN_FLAGS'))) ? get('RUN_FLAGS').slice()
    : ['hardened', 'keeperDone', 'rootDone', 'altPath', 'clears', 'deepFracture', 'malware', 'planetarium',
       'skipStreak', 'otherKills', 'unwrittenDeaths', 'amalgamDone', 'tribunalDone', 'metFounder',
       'keyEver', 'campVisits', 'devTalkDue', 'trueEnd', 'opoCoax', 'opoMet', 'opoDone'];

  /* ------------------------------ state ------------------------------- */
  const TC = { god: false, autoLevel: false, open: false, hist: [], hi: 0, timeline: [] };

  /* ------------------------------ helpers ----------------------------- */
  function log(msg, cls) {
    const line = document.createElement('div');
    if (cls) line.className = cls;
    line.textContent = msg;
    out.appendChild(line);
    while (out.childNodes.length > 400) out.removeChild(out.firstChild);
    out.scrollTop = out.scrollHeight;
  }
  const ok = (m) => log(m, 'tc-ok');
  const err = (m) => log(m, 'tc-err');

  // never let the first-run GFX calibration or callsign screen interrupt a warp
  function skipGate() {
    try { const S = get('Save'), V = get('GFX_VER'); if (S && S.profile && V != null && S.profile.gfxSeen !== V) { S.profile.gfxSeen = V; if (S.writeLocal) S.writeLocal(); if (S.flush) S.flush(); } } catch (e) {}
  }

  function ensureRun() {
    if (!has('state')) { err('engine not ready'); return false; }
    skipGate();
    if (get('state') !== 'play') { try { call('resetGame'); G('state = "play"'); ok('started a run'); } catch (e) { err('could not start run: ' + e.message); return false; } }
    return true;
  }

  /* Event / boss / rite starters assume a fresh run, exactly as the test
     harness drives them: resetGame → state 'play' → (kit awake) → starter.
     The starter then sets whatever state it wants (rite, cutscene, …). */
  function starterRun(fn, label) {
    if (!has('state')) { err('engine not ready'); return; }
    try {
      skipGate();
      call('resetGame'); G('state = "play"');
      try { const P = get('P'); if (P) P.awake = 1; } catch (e) {}
      fn();
      ok(label);
    } catch (e) { err(label + ': ' + e.message); }
  }

  function setFlag(name, val) {
    const inRun = has('state') && get('state') === 'play' && has('runSet');
    let cur;
    if (has('RUN') && name in get('RUN')) cur = get('RUN')[name];
    else if (has('Save') && get('Save').profile) cur = get('Save').profile[name];
    if (val === undefined || val === '') val = !cur;
    try {
      if (inRun) call('runSet', name, val);
      else {
        const S = get('Save');
        if (S && S.profile) { S.profile[name] = val; if (S.writeLocal) S.writeLocal(); if (S.flush) S.flush(); }
        if (has('RUN')) get('RUN')[name] = val;
      }
      ok('flag ' + name + ' = ' + JSON.stringify(val));
      refreshFlags();
    } catch (e) { err('flag ' + name + ': ' + e.message); }
  }

  function warpBoss(key) {
    const BOSSES = get('BOSSES');
    if (!BOSSES || !BOSSES[key]) { err('no such boss: ' + key); return; }
    const bd = BOSSES[key];
    if (BOSS_STARTER[key]) { starterRun(BOSS_STARTER[key], 'warp → ' + bd.name); return; }
    // rotation / fracture boss: enter its stage, then spawn it live
    if (!ensureRun()) return;
    try {
      const STAGES = get('STAGES'), ALT = get('ALT_STAGES');
      const st = (STAGES || []).find(s => s.boss === key) || (ALT || []).find(s => s.boss === key);
      if (st) { if (st.alt && has('RUN')) get('RUN').altPath = true; call('enterStage', st); }
      if (has('wave') && get('wave') < 5) G('wave = 5');
      const E = get('enemies'), EB = get('ebullets');
      if (E) E.length = 0; if (EB) EB.length = 0;
      // freeze wave progression so the live run can't advance/re-skin over the boss
      G('bossAlive = true');
      try { G('betweenWaves = 0'); } catch (e) {}
      try { G('spawnBudget = 0'); } catch (e) {}
      try { G('waveTimer = 0'); } catch (e) {}
      try { call('banner', bd.name + '   INBOUND', bd.col); } catch (e) {}
      try { get('Audio_').boss(); } catch (e) {}
      const P = get('P'), WORLD = get('WORLD'), clamp = get('clamp');
      const x = clamp ? clamp(P.x + 320, 40, WORLD.w - 40) : P.x + 320;
      call('spawnEnemy', 'boss', x, P.y, { boss: key });
      ok('warp → ' + bd.name + ' (wave ' + get('wave') + ')');
    } catch (e) { err('warpBoss: ' + e.message); }
  }

  /* --------------------------- run watcher ----------------------------
     A basic expectations logger: each frame it snapshots the run, logs notable
     story transitions to a timeline, and checks a few invariants, surfacing
     PASS / WARN / FAIL in the console. Rules are easy to extend below. */
  const WATCH = { on: false, prev: null, s: {} };
  function wreset() { WATCH.s = { armed: false, armedWave: 0, pending: false, deadline: 0, sawTurning: false, riteSeen: false, warned: false }; }
  wreset();
  function wlog(msg, cls) { log('⟲ ' + msg, cls || 'tc-watch'); TC.timeline.push({ w: get('wave'), t: get('elapsed'), msg: msg }); while (TC.timeline.length > 400) TC.timeline.shift(); }
  function snapW() {
    const stg = get('stage') || {}, P = get('P') || {}, R = get('RUN') || {};
    return {
      state: get('state'), wave: get('wave'), stage: stg.name, deep: !!stg.deep, boss: stg.boss,
      nodesDone: get('nodesDone'), bossAlive: get('bossAlive'), riteRun: get('riteRun'),
      rite: !!(get('amalRite') || get('rootRite') || get('vrRite') || get('oprRite')),
      choice: !!get('choice'), turning: !!get('turning'), tribunal: !!get('tribunal'),
      flags: KNOWN_FLAGS.map(k => R[k]), charId: P.charId,
    };
  }
  function watchTick(now) {
    if (!WATCH.on || !has('state')) return;
    let c; try { c = snapW(); } catch (e) { return; }
    const p = WATCH.prev;
    if (!p) { WATCH.prev = c; return; }
    if ((c.state === 'menu' && p.state !== 'menu') || (p.wave > 1 && c.wave === 0)) { wreset(); wlog('— run reset —'); }

    // ---- timeline: notable transitions ----
    if (c.state !== p.state) wlog('state ' + p.state + ' → ' + c.state);
    if (c.wave !== p.wave) wlog('wave ' + c.wave + (c.stage ? '  (' + c.stage + ')' : ''));
    if (c.stage !== p.stage && c.stage) wlog('stage: ' + c.stage + (c.deep ? '  [deep · no boss]' : ''));
    if (c.bossAlive && !p.bossAlive) wlog('boss inbound: ' + (c.boss || '?'));
    if (!c.bossAlive && p.bossAlive && c.wave >= 5) wlog('boss down: ' + (p.boss || '?'));
    if (c.nodesDone && !p.nodesDone) wlog('deep cleared (nodes): ' + (c.stage || '?'));
    if (c.riteRun && !p.riteRun) wlog('rite committed: ' + c.riteRun);
    if (!c.riteRun && p.riteRun) wlog('riteRun cleared');
    if (c.rite && !p.rite) { wlog('RITE FIGHT STARTED', 'tc-ok'); WATCH.s.riteSeen = true; WATCH.s.pending = false; WATCH.s.armed = false; }
    if (c.choice && !p.choice) wlog('founder: CHOICE offered');
    if (c.turning && !p.turning) { wlog('founder: TURNING (talk) started'); WATCH.s.sawTurning = true; }
    if (c.tribunal && !p.tribunal) wlog('TRIBUNAL started');
    for (let i = 0; i < KNOWN_FLAGS.length; i++) if (c.flags[i] !== p.flags[i]) wlog('flag ' + KNOWN_FLAGS[i] + ' = ' + JSON.stringify(c.flags[i]));

    // ---- RULE 1: a committed rite MUST trigger at wave ≥25 (boss-clear path) ----
    if (c.riteRun && c.wave >= 25 && p.wave < 25) { WATCH.s.armed = true; WATCH.s.armedWave = c.wave; WATCH.s.warned = false; wlog('⌚ armed: riteRun=' + c.riteRun + ' crossed wave 25', 'tc-warn'); }
    if (c.riteRun && !c.rite && !c.bossAlive && p.bossAlive && c.wave >= 25) { WATCH.s.pending = true; WATCH.s.deadline = now + 3; }
    if (WATCH.s.pending && !c.rite && now > WATCH.s.deadline) { WATCH.s.pending = false; wlog('FAIL: boss cleared at wave ' + c.wave + ' but rite (' + c.riteRun + ') never started', 'tc-err'); }
    // a deep sector has no boss, so the rite fires on a short timer (deepExitT
    // + simAfter), not instantly — give it a grace window before calling it a
    // bypass. If the rite never comes, the pending check below FAILs it.
    if (c.riteRun && !c.rite && c.nodesDone && !p.nodesDone && c.wave >= 25) { WATCH.s.pending = true; WATCH.s.deadline = now + 6; wlog('deep sector cleared at wave ' + c.wave + ' with riteRun=' + c.riteRun + ' — rite must follow (no boss here)', 'tc-warn'); }
    if (WATCH.s.armed && !WATCH.s.riteSeen && !WATCH.s.warned && c.riteRun && c.wave > WATCH.s.armedWave + 1) { WATCH.s.warned = true; wlog('WARN: past wave ' + c.wave + ' with riteRun=' + c.riteRun + ' still unspent — rite skipped so far', 'tc-warn'); }

    // ---- RULE 2: the tribunal must not start before the talk (turning) is done ----
    if (c.tribunal && c.turning) wlog('FAIL: TRIBUNAL + TURNING active together — tribunal started before the talk finished', 'tc-err');
    if (c.tribunal && !p.tribunal && !WATCH.s.sawTurning) wlog('WARN: tribunal started with no preceding talk (turning) seen', 'tc-warn');

    WATCH.prev = c;
  }

  /* ------------------------------ commands ---------------------------- */
  const CMD = {
    help() {
      log('commands:');
      log('  run [seed] | daily | rush | freeplay | hub | menu');
      log('  pilot <runner|ember|hacker|melee|x0> | awaken [0|1]');
      log('  boss <key> | sector <1-5> | fracture <1-5> | bosses');
      log('  rite <ember|hacker|melee|runner>');
      log('  keeper|amalgam|root|tribunal|unwritten|opo|finale|intrusion');
      log('  hallows <patch|house>');
      log('  flag <name> [0|1|val] | flags | storyall <0|1> | unlock');
      log('  god [0|1] | heal | dmg <mult> | kill | clearfield');
      log('  wave <n> | nextwave | autolevel [0|1] | pick <1-4> | credits <n>');
      log('  above [0|1] | altpath [0|1] | seed <n> | state [name] | js <expr> | clear');
      log('  watch [0|1] — log run story-events + check expectations | timeline [n] | expect');
    },
    run(a) { skipGate(); if (a[0] != null && has('runSeedNext')) G('runSeedNext = ' + Number(a[0])); try { call('resetGame'); G('state = "play"'); ok('run started'); } catch (e) { err(e.message); } },
    daily() { try { call('startDaily'); ok('daily'); } catch (e) { err(e.message); } },
    rush() { try { call('startRush'); ok('boss rush'); } catch (e) { err(e.message); } },
    freeplay() { try { call('startFreeplay'); ok('freeplay'); } catch (e) { err(e.message); } },
    hub() { try { call('enterHub'); ok('hub'); } catch (e) { err(e.message); } },
    menu() { try { if (has('quitToMenu')) call('quitToMenu'); else G('state = "menu"'); ok('menu'); } catch (e) { err(e.message); } },
    pilot(a) {
      const id = a[0] === 'vagrant' ? 'melee' : a[0];
      const CHARS = get('CHARS'); if (!CHARS) return err('no CHARS');
      const i = CHARS.findIndex(c => c.id === id);
      if (i < 0) return err('no such pilot: ' + a[0] + ' (try: ' + PILOTS.map(p => p[0]).join(', ') + ')');
      try { call('applyChar', i); if (has('selectedChar')) G('selectedChar = ' + i); ok('pilot → ' + CHARS[i].n); } catch (e) { err(e.message); }
    },
    awaken(a) { const v = a[0] == null ? 1 : Number(a[0]); try { get('P').awake = v; ok('awake = ' + v); } catch (e) { err(e.message); } },
    boss(a) { if (!a[0]) return err('boss <key> — ' + CMD.bosses.list().join(', ')); warpBoss(a[0]); },
    bosses() { log('bosses: ' + CMD.bosses.list().join(', ')); },
    sector(a) {
      const n = Math.max(1, Number(a[0] || 1)); if (!ensureRun()) return;
      try { if (has('RUN')) get('RUN').altPath = false; call('applyStage', n - 1); G('wave = ' + ((n - 1) * 5)); G('betweenWaves = 0.1'); ok('sector ' + n + ' — ' + get('stage').name); } catch (e) { err(e.message); }
    },
    fracture(a) {
      const n = Math.max(1, Number(a[0] || 1)); if (!ensureRun()) return;
      try { const ALT = get('ALT_STAGES'); if (has('RUN')) { get('RUN').altPath = true; get('RUN').deepFracture = true; } call('enterStage', ALT[Math.min(n - 1, ALT.length - 1)]); ok('fracture ' + n + ' — ' + get('stage').name); } catch (e) { err(e.message); }
    },
    rite(a) { if (!a[0]) return err('rite <ember|hacker|melee|runner>'); starterRun(() => call('enterRite', a[0]), 'rite → ' + a[0]); },
    keeper() { starterRun(() => call('startKeeperFight'), 'keeper'); },
    amalgam() { starterRun(() => call('startAmalgam'), 'amalgam'); },
    root() { starterRun(() => call('startRoot'), 'root'); },
    tribunal() { starterRun(() => call('startTribunal'), 'tribunal'); },
    unwritten() { starterRun(() => { call('startUnwritten'); try { call('unwJump', 3); } catch (e) {} }, 'unwritten'); },
    opo() { starterRun(() => call('opoOpen'), 'one point oh'); },
    finale() { starterRun(() => { if (has('startFinale')) call('startFinale'); else call('startVirus'); }, 'finale'); },
    intrusion() { starterRun(() => call('startIntrusion'), 'intrusion'); },
    hallows(a) { if (!a[0]) return err('hallows <' + HALLOWS.join('|') + '>'); starterRun(() => call('hlAreaStart', a[0]), 'hallows → ' + a[0]); },
    flag(a) { if (!a[0]) return err('flag <name> [0|1|val]'); let v = a[1]; if (v === '0' || v === 'false') v = false; else if (v === '1' || v === 'true') v = true; else if (v != null && v !== '' && !isNaN(Number(v))) v = Number(v); setFlag(a[0], v); },
    flags() {
      const RUN = get('RUN') || {}, prof = (get('Save') || {}).profile || {};
      log('story flags (RUN / Save):');
      KNOWN_FLAGS.forEach(k => log('  ' + k.padEnd(16) + ' = ' + JSON.stringify(k in RUN ? RUN[k] : prof[k])));
    },
    storyall(a) { const v = a[0] === '0' || a[0] === 'false' ? false : true; KNOWN_FLAGS.forEach(k => setFlag(k, v === false ? false : (k === 'clears' ? 2 : k === 'opoCoax' ? 4 : true))); ok('all story flags ' + (v ? 'ON' : 'OFF')); },
    unlock() {
      try {
        const S = get('Save'); if (S && S.profile) {
          if (has('GFX_VER')) S.profile.gfxSeen = get('GFX_VER');
          if (has('RUSH_PEAK')) S.profile.rushBest = get('RUSH_PEAK');
          KNOWN_FLAGS.forEach(k => { if (!(k in S.profile)) S.profile[k] = true; });
          S.profile.clears = Math.max(2, S.profile.clears || 0);
          if (S.writeLocal) S.writeLocal(); if (S.flush) S.flush();
        }
        try { const M = get('MALWARE'); if (M && S.profile) S.profile.codexM = M.map(m => m.id); } catch (e) {}
        ok('unlocked: gfx, vagrant, pilots, story flags');
        refreshFlags();
      } catch (e) { err(e.message); }
    },
    god(a) { TC.god = a[0] == null ? !TC.god : (a[0] === '1' || a[0] === 'true'); if (TC.god) { try { const P = get('P'); if (P) { P.maxHp = Math.max(P.maxHp || 0, 100000); P.hp = P.maxHp; } } catch (e) {} } ok('god = ' + TC.god); godBtn(); },
    heal() { try { const P = get('P'); P.hp = P.maxHp; ok('healed'); } catch (e) { err(e.message); } },
    dmg(a) { const m = Number(a[0] || 2); try { get('P').dmg *= m; ok('dmg ×' + m); } catch (e) { err(e.message); } },
    kill() { try { const E = get('enemies'); let n = 0; E.forEach(e => { if (e && !e.dead) { e.hp = 0; n++; } }); ok('killed ' + n + ' (may trigger story)'); } catch (e) { err(e.message); } },
    clearfield() { try { get('enemies').length = 0; get('ebullets').length = 0; if (has('hazards')) get('hazards').length = 0; ok('field cleared'); } catch (e) { err(e.message); } },
    wave(a) { try { G('wave = ' + Number(a[0] || 0)); ok('wave = ' + get('wave')); } catch (e) { err(e.message); } },
    nextwave() { try { G('betweenWaves = 0.05'); G('bossAlive = false'); ok('next wave'); } catch (e) { err(e.message); } },
    autolevel(a) { TC.autoLevel = a[0] == null ? !TC.autoLevel : (a[0] === '1' || a[0] === 'true'); ok('autolevel = ' + TC.autoLevel); },
    pick(a) { try { call('handleKey', String(Math.max(1, Math.min(4, Number(a[0] || 1))))); ok('picked'); } catch (e) { err(e.message); } },
    credits(a) { try { G('credits = ' + Number(a[0] || 0)); ok('credits = ' + get('credits')); } catch (e) { err(e.message); } },
    above(a) { const v = a[0] === '0' ? false : true; try { if (has('RUN')) get('RUN').above = v; if (has('ABOVE') && v) { get('ABOVE').from = 1; try { call('aboveBegin'); } catch (e) {} } ok('FROM ABOVE = ' + v); } catch (e) { err(e.message); } },
    altpath(a) { const v = a[0] === '0' ? false : true; setFlag('altPath', v); },
    seed(a) { try { G('runSeedNext = ' + Number(a[0] || 0)); ok('next seed = ' + a[0]); } catch (e) { err(e.message); } },
    state(a) { if (a[0]) { try { G('state = ' + JSON.stringify(a[0])); ok('state = ' + a[0]); } catch (e) { err(e.message); } } else log('state = ' + get('state')); },
    js(a, raw) { try { const r = G(raw.slice(raw.indexOf('js') + 2).trim()); log('» ' + (typeof r === 'object' ? JSON.stringify(r) : String(r))); } catch (e) { err(e.message); } },
    watch(a) { WATCH.on = a[0] == null ? !WATCH.on : (a[0] === '1' || a[0] === 'true'); if (WATCH.on) { WATCH.prev = null; wreset(); } ok('watch = ' + WATCH.on + (WATCH.on ? ' — logging story events + checking rules' : '')); watchBtnUpd(); },
    timeline(a) { const n = Number(a[0] || 25); const t = TC.timeline.slice(-n); if (!t.length) return log('(timeline empty — run `watch 1` first)'); t.forEach(e => log('  [w' + (e.w == null ? '?' : e.w) + '] ' + e.msg)); },
    expect() { log('watcher ' + (WATCH.on ? 'ON' : 'off') + '   riteRun=' + JSON.stringify(get('riteRun')) + '   wave=' + get('wave')); log('  armed=' + WATCH.s.armed + ' pending=' + WATCH.s.pending + ' sawTurning=' + WATCH.s.sawTurning + ' riteSeen=' + WATCH.s.riteSeen); log('rules: [1] committed rite must trigger at wave≥25 on a boss clear  [2] tribunal only after the talk (turning)'); },
    clear() { out.innerHTML = ''; TC.timeline = []; },
  };
  CMD.bosses.list = () => [...ROTATION, '|', ...FRACTURE, '|', ...EVENT_BOSS];

  function run(raw) {
    raw = raw.trim(); if (!raw) return;
    log('› ' + raw, 'tc-cmd');
    TC.hist.push(raw); TC.hi = TC.hist.length;
    const parts = raw.split(/\s+/); const cmd = parts[0]; const args = parts.slice(1);
    if (CMD[cmd]) { try { CMD[cmd](args, raw); } catch (e) { err(cmd + ': ' + e.message); } }
    else err('unknown: ' + cmd + '  (type help)');
  }

  /* ------------------------------- UI --------------------------------- */
  const style = document.createElement('style');
  style.textContent = `
    #tc-btn{position:fixed;top:8px;right:8px;z-index:2147483646;font:12px monospace;background:#0b1220;color:#67e8f9;border:1px solid #1d3557;border-radius:6px;padding:4px 8px;cursor:pointer;opacity:.75}
    #tc-btn:hover{opacity:1}
    #tc{position:fixed;top:0;right:0;width:380px;max-width:92vw;height:100vh;z-index:2147483647;display:none;flex-direction:column;background:rgba(6,9,16,.96);border-left:1px solid #1d3557;color:#cbd5e1;font:12px/1.4 ui-monospace,Menlo,Consolas,monospace;box-shadow:-4px 0 24px rgba(0,0,0,.5)}
    #tc.open{display:flex}
    #tc .hd{display:flex;align-items:center;justify-content:space-between;padding:6px 10px;border-bottom:1px solid #1d3557;color:#67e8f9}
    #tc .hd b{letter-spacing:1px}
    #tc .hd span{cursor:pointer;opacity:.7}#tc .hd span:hover{opacity:1}
    #tc .stat{padding:4px 10px;border-bottom:1px solid #141c2e;color:#64748b;white-space:pre}
    #tc .btns{padding:6px 8px;border-bottom:1px solid #141c2e;overflow:auto;max-height:46vh}
    #tc .grp{margin-bottom:6px}
    #tc .grp h4{margin:4px 2px;color:#94a3b8;font-weight:600;font-size:11px;letter-spacing:.5px}
    #tc button.b{font:11px monospace;background:#0e1626;color:#a5f3fc;border:1px solid #1d3557;border-radius:5px;padding:3px 7px;margin:2px;cursor:pointer}
    #tc button.b:hover{background:#16243c}
    #tc button.b.on{background:#164e3b;color:#86efac;border-color:#15803d}
    #tc button.b.fl{border-color:#334155}
    #tc button.b.fl.on{background:#3b1d4e;color:#e9d5ff;border-color:#7e22ce}
    #tc .out{flex:1;overflow:auto;padding:6px 10px;white-space:pre-wrap;word-break:break-word}
    #tc .out .tc-cmd{color:#67e8f9}#tc .out .tc-ok{color:#86efac}#tc .out .tc-err{color:#fca5a5}
    #tc .out .tc-warn{color:#fcd34d}#tc .out .tc-watch{color:#94a3b8}
    #tc .in{display:flex;border-top:1px solid #1d3557}
    #tc .in input{flex:1;background:#0b1220;color:#e2e8f0;border:0;padding:8px 10px;font:12px monospace;outline:none}
  `;
  document.head.appendChild(style);

  const btn = document.createElement('button');
  btn.id = 'tc-btn'; btn.textContent = '⚙ test'; document.body.appendChild(btn);

  const panel = document.createElement('div'); panel.id = 'tc';
  panel.innerHTML = `
    <div class="hd"><b>VOIDRUNNER · TEST</b><span id="tc-x">✕</span></div>
    <div class="stat" id="tc-stat">—</div>
    <div class="btns" id="tc-btns"></div>
    <div class="out" id="tc-out"></div>
    <div class="in"><input id="tc-in" placeholder="type a command — help" autocomplete="off" spellcheck="false"></div>`;
  document.body.appendChild(panel);
  const out = panel.querySelector('#tc-out');
  const input = panel.querySelector('#tc-in');
  const statEl = panel.querySelector('#tc-stat');
  const btnsEl = panel.querySelector('#tc-btns');

  function mkBtn(label, cls, fn) { const b = document.createElement('button'); b.className = 'b' + (cls ? ' ' + cls : ''); b.textContent = label; b.onclick = fn; return b; }
  function group(title) { const g = document.createElement('div'); g.className = 'grp'; const h = document.createElement('h4'); h.textContent = title; g.appendChild(h); btnsEl.appendChild(g); return g; }

  // build the button board
  let g;
  g = group('PILOTS'); PILOTS.forEach(p => g.appendChild(mkBtn(p[1], '', () => run('pilot ' + p[0]))));
  g.appendChild(mkBtn('awaken', '', () => run('awaken 1')));
  g = group('MODES / ROUTES');
  [['run', 'run'], ['daily', 'daily'], ['boss rush', 'rush'], ['freeplay', 'freeplay'], ['hub', 'hub'], ['menu', 'menu']].forEach(x => g.appendChild(mkBtn(x[0], '', () => run(x[1]))));
  [1, 2, 3, 4, 5].forEach(n => g.appendChild(mkBtn('sector ' + n, '', () => run('sector ' + n))));
  [1, 2, 3, 4, 5].forEach(n => g.appendChild(mkBtn('fracture ' + n, '', () => run('fracture ' + n))));
  g = group('BOSSES'); [...ROTATION, ...FRACTURE, ...EVENT_BOSS].forEach(k => g.appendChild(mkBtn(k, '', () => run('boss ' + k))));
  g = group('RITES'); RITES.forEach(r => g.appendChild(mkBtn(r[1], '', () => run('rite ' + r[0]))));
  g = group('EVENTS'); [['keeper', 'keeper'], ['amalgam', 'amalgam'], ['root', 'root'], ['tribunal', 'tribunal'], ['unwritten', 'unwritten'], ['ONE POINT OH', 'opo'], ['finale', 'finale'], ['intrusion', 'intrusion']].forEach(x => g.appendChild(mkBtn(x[0], '', () => run(x[1]))));
  HALLOWS.forEach(a => g.appendChild(mkBtn('hallows ' + a, '', () => run('hallows ' + a))));
  g = group('CHEATS');
  g.appendChild(godB = mkBtn('god', '', () => run('god')));
  [['heal', 'heal'], ['dmg ×3', 'dmg 3'], ['kill all', 'kill'], ['clear field', 'clearfield'], ['next wave', 'nextwave'], ['+credits', 'credits 99999']].forEach(x => g.appendChild(mkBtn(x[0], '', () => run(x[1]))));
  g.appendChild(alvlB = mkBtn('autolevel', '', () => run('autolevel')));
  [['FROM ABOVE on', 'above 1'], ['unlock all', 'unlock']].forEach(x => g.appendChild(mkBtn(x[0], '', () => run(x[1]))));
  const flagsGrp = group('STORY FLAGS (click = toggle)');
  flagsGrp.appendChild(mkBtn('ALL on', '', () => run('storyall 1')));
  flagsGrp.appendChild(mkBtn('ALL off', '', () => run('storyall 0')));
  const flagBtns = {};
  KNOWN_FLAGS.forEach(k => { const b = mkBtn(k, 'fl', () => setFlag(k)); flagBtns[k] = b; flagsGrp.appendChild(b); });
  const monGrp = group('RUN WATCH (expectations)');
  var godB, alvlB, watchB;
  monGrp.appendChild(watchB = mkBtn('watch', '', () => run('watch')));
  [['timeline', 'timeline 30'], ['expect', 'expect']].forEach(x => monGrp.appendChild(mkBtn(x[0], '', () => run(x[1]))));

  function godBtn() { if (godB) godB.classList.toggle('on', TC.god); }
  function watchBtnUpd() { if (watchB) watchB.classList.toggle('on', WATCH.on); }
  function refreshFlags() {
    const RUN = get('RUN') || {}, prof = (get('Save') || {}).profile || {};
    KNOWN_FLAGS.forEach(k => { const v = k in RUN ? RUN[k] : prof[k]; if (flagBtns[k]) flagBtns[k].classList.toggle('on', !!v); });
  }

  /* ---------------------------- open / close -------------------------- */
  function toggle(open) { TC.open = open == null ? !TC.open : open; panel.classList.toggle('open', TC.open); btn.style.display = TC.open ? 'none' : 'block'; if (TC.open) { input.focus(); refreshFlags(); } }
  btn.onclick = () => toggle(true);
  panel.querySelector('#tc-x').onclick = () => toggle(false);

  /* All key handling lives in ONE window capture-phase listener: it runs
     before the game's own listeners, does the console's own Enter/arrows/esc,
     then stops the event so the game never sees anything typed in the box.
     (A separate listener on the input would never fire — stopImmediate here
     halts the event before it reaches the target.) Normal character keys are
     not preventDefault'd, so they still type into the box. */
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' && document.activeElement !== input) { e.preventDefault(); e.stopImmediatePropagation(); toggle(); return; }
    if (TC.open && document.activeElement === input) {
      if (e.key === 'Enter') { run(input.value); input.value = ''; e.preventDefault(); }
      else if (e.key === 'Escape') { toggle(false); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { if (TC.hi > 0) { TC.hi--; input.value = TC.hist[TC.hi] || ''; } e.preventDefault(); }
      else if (e.key === 'ArrowDown') { if (TC.hi < TC.hist.length) { TC.hi++; input.value = TC.hist[TC.hi] || ''; } e.preventDefault(); }
      e.stopImmediatePropagation();
    }
  }, true);
  window.addEventListener('keyup', (e) => { if (TC.open && document.activeElement === input) e.stopImmediatePropagation(); }, true);

  /* --------------------------- error capture -------------------------- */
  window.addEventListener('error', (e) => err('⚠ ' + (e.message || e.error) + '  @' + (e.filename || '').split('/').pop() + ':' + e.lineno));
  window.addEventListener('unhandledrejection', (e) => err('⚠ promise: ' + (e.reason && e.reason.message || e.reason)));
  const _ce = console.error.bind(console); console.error = (...a) => { try { err('⚠ ' + a.map(x => x && x.message || x).join(' ')); } catch (_) {} _ce(...a); };

  /* --------------------------- status + loop -------------------------- */
  let frames = 0, fps = 0, lastT = performance.now();
  function loop(t) {
    frames++;
    if (t - lastT >= 500) { fps = Math.round(frames * 1000 / (t - lastT)); frames = 0; lastT = t; }
    if (TC.god) { try { const P = get('P'); if (P) P.hp = P.maxHp; } catch (e) {} }
    if (TC.autoLevel && has('state') && get('state') === 'levelup') { try { call('handleKey', '1'); } catch (e) {} }
    try { watchTick(t / 1000); } catch (e) {}
    if (TC.open) {
      try {
        const st = get('state'), P = get('P'), E = get('enemies'), stg = get('stage');
        const alive = E ? E.filter(x => x && !x.dead).length : 0;
        statEl.textContent =
          'state ' + st + '   wave ' + get('wave') + '   fps ' + fps + '\n' +
          'stage ' + (stg ? stg.name : '—') + '   enemies ' + alive + '\n' +
          'hp ' + (P ? Math.round(P.hp) + '/' + Math.round(P.maxHp) : '—') +
          '   pilot ' + (P && P.charId ? P.charId : '—') + (TC.god ? '   [GOD]' : '');
      } catch (e) {}
    }
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);

  // mark the GFX calibration seen up front so first warps are never interrupted
  setTimeout(skipGate, 300);
  log('VOIDRUNNER test console ready — type  help', 'tc-ok');
  log('toggle with the ` key or the ⚙ button.');
})();
