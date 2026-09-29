/* ===========================================================================
   THE WARDROBE — ALL HALLOWS
   The toolkit the vigil's prize skins are drawn on. They are event cosmetics
   and carry the event's budget (user, 28 Sep: "cosmetics for events have a
   much higher budget"), so a prize here is not the ordinary awards' one pass
   over a finished hull. It is a costume with its own clock, its own
   particles, cloth and rope, a say in every moment of a run, and a stage in
   the menu to be shown off on.

     THE WEARER   one object the art reads instead of the pilot (called `me`
                  in every hook). Everything a skin can want to know — where,
                  how fast, turning which way, hurt, dashing, low, how hot the
                  fight is — and everything it can ask for: sockets on the
                  hull, moments, particles, rope and cloth, springs, trail
                  points, lamps.
     THE HOOKS    hlSkin*, at the foot of this file. One per layer of a pilot
                  (trail, back, hull, front, glow, screen, afterimages,
                  rounds, debris, bodies, lights, the stage) and one per moment
                  a skin answers (equip, run, shot, volley, a round ending,
                  kill, streak, hurt, heal, shield, dash, parry, level, wave,
                  low, downed, death).
     THE STAGE    a puppet that flies, fires, dashes, kills and levels by
                  itself, drawn through exactly the same hooks: the skin
                  menu's showcase, the dropdown's card, and the harness bench.

   It is written on THE KIT and leans on it (springs, chains, verlet, the
   timeline, noise, the light and its sprites, the particle kinds). Beyond the
   kit it needs only what the game and the harness both have: ctx, W, H, TAU,
   clamp, lerp, rgba, rnd, drawGlow, uiTime and hullPath(id). It never reads
   the game. The game's adapter (just below this block in index.html) and the
   harness (hl-skin-base.js) each feed a wearer, and the art only ever reads
   the wearer. That is what lets one piece of art draw in a run, in the menu
   and in a design file without a change.

   Only this book's prize line is dressed here (HL_WR.fx). The ordinary awards
   keep SkinFx and its budget. There is no frame budget and no effects-panel
   gate in here: the panel's switches belong to the ordinary game.

   The same text is prepatch hl-wardrobe.js, byte for byte, the way the kit is
   hl-kit.js. Lift a new one with:  node C:\.claude\lift-hl-art.mjs --wardrobe <file>
   Everything it declares is hlWr / HL_WR; the art's hooks are hlSkin*.
=========================================================================== */

const HL_WR = {
  fx: ['hallows', 'lostsoul'],   // what this book's prizes wear (DEV_SKINS 'hl-*')
  debug: false,                  // sockets, trail, springs and moments drawn over the pilot
  partMax: 1800,                 // the wearer's own particle pool
  momentMax: 160,
  trail: 0.5,                    // seconds of trail kept, unless the look says otherwise
  trailGap: 3,                   // px between trail samples
  streakGap: 2.2,                // a kill this soon after the last one extends the streak
  streaks: [5, 10, 20, 35, 50, 75, 100, 150, 200, 300],   // hlSkinStreakFx fires on these
  lowIn: 0.3, lowOut: 0.42,      // low health: in below the first, out above the second
  heat: { kill: 0.07, elite: 0.16, boss: 0.45, shot: 0.004, hold: 1.6, decay: 0.14 },
  recoil: 60                     // how hard a volley kicks me.recoil
};
const hlWrOwns = s => !!(s && s.fx && HL_WR.fx.indexOf(s.fx) >= 0);

/* Every hook, by name. The harness and the admin panel read this to say
   which ones the art has drawn and which are still the placeholders. */
const HL_WR_HOOKS = [
  'hlSkinLook', 'hlSkinPreload', 'hlSkinTick',
  'hlSkinTrail', 'hlSkinBack', 'hlSkinHullSwap', 'hlSkinHull', 'hlSkinFront', 'hlSkinGhost',
  'hlSkinRound', 'hlSkinDebris', 'hlSkinBody', 'hlSkinGlow', 'hlSkinMoment', 'hlSkinScreen',
  'hlSkinLights', 'hlSkinStage',
  'hlSkinEquipFx', 'hlSkinRunFx', 'hlSkinShotFx', 'hlSkinVolleyFx', 'hlSkinRoundEndFx',
  'hlSkinKillFx', 'hlSkinStreakFx', 'hlSkinHurtFx', 'hlSkinHealFx', 'hlSkinShieldFx',
  'hlSkinDashFx', 'hlSkinDashEndFx', 'hlSkinParryFx', 'hlSkinLevelFx', 'hlSkinWaveFx',
  'hlSkinLowFx', 'hlSkinDownFx', 'hlSkinDeathFx'
];
function hlWrHookState() {
  return HL_WR_HOOKS.map(n => {
    const f = globalThis[n];
    return { name: n, art: typeof f === 'function' && !f.hlStock };
  });
}

/* ================================= SOCKETS =================================
   Where things attach, per hull, in hull space: x forward along the nose, y
   to starboard. Taken off hullPath()'s own points, so a lantern hung from
   'tail' hangs from the tail of whichever pilot is flying. A pilot missing
   from the table wears the runner's. 'above' and 'below' are not on the hull:
   they stay square to the screen, R + 4 over and under it (me.sock('above')).
=========================================================================== */
const HL_WR_SOCK = {
  runner: { nose: [18, 0], muzzle: [21, 0], canopy: [3, 0], core: [0, 0], tail: [-6.5, 0],
            exhaust: [-13, 0], wingL: [-1, -8.5], wingR: [-1, 8.5], tipL: [-5, -13], tipR: [-5, 13] },
  ember:  { nose: [22, 0], muzzle: [24, 0], canopy: [-1.4, 0], core: [0, 0], tail: [-9, 0],
            exhaust: [-15, 0], wingL: [1, -9.5], wingR: [1, 9.5], tipL: [2, -13.5], tipR: [2, 13.5] },
  hacker: { nose: [18, 0], muzzle: [20, 0], canopy: [2, 0], core: [0, 0], tail: [-9, 0],
            exhaust: [-13, 0], wingL: [-3, -8], wingR: [-3, 8], tipL: [10, -13], tipR: [10, 13] },
  melee:  { nose: [12.6, 0], muzzle: [14, 0], canopy: [2, 0], core: [0, 0], tail: [-12.8, 0],
            exhaust: [-16, 0], wingL: [1, -9], wingR: [1, 9], tipL: [2.4, -13.2], tipR: [2.4, 13.2] }
};

/* ================================= THE WEARER ==============================
   Made by whoever feeds it (the game's adapter, the stage, the harness).
   The source writes the pilot's raw state onto it each frame — x, y, ang, vx,
   vy, r, hp, maxHp, hurt, phasing, blink, dashing, dashK, parry, still,
   down, shield, level, wave, kills, hidden, lit, live — then calls
   hlWrStep(me, dt), then tells it what happened (hlWrOn, hlWrKill,
   hlWrRoundsSync). Everything else on it is derived here.

   The art may READ any field. It may WRITE only me.art (its own bag, kept
   across runs until the skin is taken off) and the fields of things it asked
   for (a moment's m.art, a round's R.art, its ropes and springs).
=========================================================================== */
const HL_WR_SINCE = ['equip', 'run', 'shot', 'kill', 'hurt', 'heal', 'shield', 'dash', 'dashEnd',
                     'parry', 'perfect', 'level', 'wave', 'low', 'down', 'death', 'streak'];

function hlWrWearer(where) {
  const me = Object.create(HL_WR_ME);
  Object.assign(me, {
    where: where || 'run',     // 'run' | 'stage' | 'bench'
    real: false,               // true only where the global P is this pilot (the run, the harness)
    live: false,               // a run is being played right now (not paused, not dead)
    lit: false,                // the room has the kit's light pass (the vigil, an area)
    hidden: false,             // the hull is not being drawn (FUSION CORE, the strike, dead)
    scene: '',                 // 'run' | 'hub' | 'vigil' | an area id | 'stage'
    s: null, id: '', fx: '', tier: 0, col: '#ffffff', look: {}, pilot: 'runner',
    hullCol: '#67e8f9',        // the colour the game is drawing the hull in this frame
    x: 0, y: 0, ang: 0, vx: 0, vy: 0, speed: 0, dir: 0, turn: 0, r: 12, R: 23,
    t: 0, dt: 0, clock: 0, age: 0,
    hp: 1, maxHp: 1, hpK: 1, low: false, lowK: 0, hurt: 0, phasing: false, blink: false,
    dashing: false, dashK: 0, dashX: 1, dashY: 0, parry: false, still: false, down: false,
    shield: 0, level: 1, wave: 0, kills: 0,
    streak: 0, best: 0, heat: 0, pulse: 0, firing: false, idle: 0,
    lean: 0, recoil: 0, flinch: 0, bob: 0, stretch: { along: 1, across: 1 },
    since: {}, trail: [], rounds: new Map(), moments: [], parts: [],
    bodies: {}, springs: {}, art: {},
    _acc: {}, _seed: new WeakMap(), _kinds: HL_PART, _lookFn: undefined, _ang0: 0, _rt: 0,
    _sp: { lean: hlSpring(0, 90, 11), recoil: hlSpring(0, 260, 22), flinch: hlSpring(0, 210, 9),
           low: hlSpring(0, 18, 8.5), idle: hlSpring(0, 6, 5) }
  });
  for (const k of HL_WR_SINCE) me.since[k] = 99;
  return me;
}

const HL_WR_ME = {
  /* ---- where things are ---------------------------------------------- */
  /* a socket in hull space: [x, y] */
  sockL(name) {
    const T = HL_WR_SOCK[this.pilot] || HL_WR_SOCK.runner;
    return T[name] || T.core;
  },
  /* a socket in the world: { x, y, ang } (ang is the hull's heading) */
  sock(name) {
    if (name === 'above' || name === 'below') {
      const up = name === 'above' ? -1 : 1;
      return { x: this.x, y: this.y + up * (this.R + 4), ang: up * Math.PI / 2 };
    }
    const l = this.sockL(name);
    return this.local(l[0], l[1]);
  },
  /* a point in hull space, in the world */
  local(lx, ly) {
    const c = Math.cos(this.ang), s = Math.sin(this.ang);
    return { x: this.x + lx * c - ly * s, y: this.y + lx * s + ly * c, ang: this.ang };
  },
  /* runs fn with ctx in hull space (origin on the hull, x along the nose) */
  inHull(fn) {
    ctx.save(); ctx.translate(this.x, this.y); ctx.rotate(this.ang);
    try { return fn(this); } finally { ctx.restore(); }
  },
  /* runs fn with the origin on the hull and the axes square to the screen */
  upright(fn) {
    ctx.save(); ctx.translate(this.x, this.y);
    try { return fn(this); } finally { ctx.restore(); }
  },
  /* the pilot's outline as the current path, in hull space: fill it, stroke
     it, or ctx.clip() to it to carve into the plating */
  hullPath() { hullPath(this.pilot); },

  /* ---- when things happened ---------------------------------------------
     1 at the moment an event happened, falling to 0 over dur seconds:
     me.env('kill', 0.3) is a flash that answers every kill. */
  env(ev, dur = 0.4, ease) {
    const s = this.since[ev];
    if (s === undefined || s >= dur) return 0;
    return 1 - hlEase(ease || 'lin', s / dur);
  },

  /* ---- moments ------------------------------------------------------------
     Something with a length, started (usually from an Fx hook) and drawn by
     hlSkinMoment(me, m) every frame until it ends. The wardrobe ages it; the
     art only draws m.k (0 → 1) or m.age.
       o.x, o.y, o.ang   where (default: the pilot, now)
       o.follow          rides with the pilot rather than staying where it began
       o.layer           'back' (under the hull, lit) · 'front' (over the hull)
                         · 'glow' (the additive pass) · 'screen' (CSS px, over
                         the world, under the HUD). Default 'front' if it
                         follows, else 'glow'.
       o.tl              a timeline definition ({ tracks, cues }, see THE KIT):
                         m.tl.v('track') is scrubbed with the moment, so a
                         flourish can be keyed rather than written as maths.
       anything else     yours, on m.o */
  moment(name, dur = 1, o = {}) {
    const m = {
      name, dur: (o.tl && o.tl.len) || dur, age: 0, k: 0,
      x: o.x ?? this.x, y: o.y ?? this.y, ang: o.ang ?? this.ang,
      follow: !!o.follow, layer: o.layer || (o.follow ? 'front' : 'glow'),
      seed: Math.random(), o, art: {}, tl: null
    };
    if (o.tl) m.tl = hlTimeline(Object.assign({ len: m.dur, name }, o.tl));
    this.moments.push(m);
    if (this.moments.length > HL_WR.momentMax) this.moments.shift();
    return m;
  },
  /* the live moments of one name */
  playing(name) { return this.moments.filter(m => m.name === name); },

  /* ---- particles ------------------------------------------------------------
     The wearer's own pool, stepped and drawn by the wardrobe wherever the
     skin is (a run, the menu stage, the harness), outside the event's rooms
     too. Kinds are THE KIT's (ember, smoke, mote, clod, wisp, bat) plus any
     the look adds (look.kinds). A kind's layer: 'lit' draws under the pilot,
     'glow' in the additive pass. */
  emit(kind, x, y, n = 1, o = {}) {
    const K = this._kinds[kind];
    if (!K) return;
    for (let i = 0; i < n; i++) {
      if (this.parts.length >= HL_WR.partMax) this.parts.shift();
      const q = { kind, x: x + (o.spread ? rnd(-o.spread, o.spread) : 0),
                  y: y + (o.spread ? rnd(-o.spread, o.spread) : 0) };
      K.make(q, o);
      this.parts.push(q);
    }
  },
  /* rate per second, the same at any frame rate, clamped so a long frame
     cannot dump a hundred at once. Only inside hlSkinTick. */
  every(key, rate, fn) {
    const a = (this._acc[key] || 0) + this.dt * rate;
    const n = Math.min(24, Math.floor(a));
    this._acc[key] = a - Math.floor(a);
    for (let i = 0; i < n; i++) fn(i, n);
    return n;
  },

  /* ---- secondary motion, managed ------------------------------------------
     Made on first ask, kept until the skin comes off or a run starts, and
     stepped by the wardrobe after hlSkinTick, so the art only draws them.
     Ropes and cloth are pinned to a socket and stream behind the hull: they
     are pushed against the pilot's velocity (o.drag, default 1.2) and settle
     astern at rest (o.settle, px/s², default 60), with a little flutter
     (o.flutter, default 40). Ask for them in hlSkinTick or an Fx hook, never
     first from a draw hook. */
  rope(key, sock = 'tail', n = 8, seg = 5, o = {}) {
    let B = this.bodies[key];
    if (!B) {
      const p = this.sock(sock);
      B = this.bodies[key] = { kind: 'rope', sock, o,
        b: hlRope(p.x, p.y, n, seg, Object.assign({ ang: this.ang + Math.PI + (o.rot || 0), gy: 0, damp: 0.96 }, o)) };
    }
    return B.b;
  },
  /* a cloth hung from a socket: its pinned edge laid across the hull (o.spread
     widens it), its rows trailing astern (o.rot turns it off the axis). Nothing
     of it is let forward of the pin line (o.behind, default on; o.gap px):
     spun half a turn, it drags round the stern rather than folding over. */
  cloth(key, sock = 'tail', cols = 5, rows = 6, seg = 4, o = {}) {
    let B = this.bodies[key];
    if (!B) {
      B = this.bodies[key] = { kind: 'cloth', sock, o,
        b: hlCloth(0, 0, cols, rows, seg, Object.assign({ gy: 0, damp: 0.95, pin: 'top' }, o)) };
      hlWrClothLay(this, B, true);
    }
    return B.b;
  },
  /* a chain of angles (THE KIT's hlChain) rooted at a socket, pointing astern:
     a tail, a tassel, a flame's tongue. .pts is what to draw. */
  chain(key, sock = 'tail', n = 6, seg = 5, o = {}) {
    let B = this.bodies[key];
    if (!B) B = this.bodies[key] = { kind: 'chain', sock, o,
      b: hlChain(n, seg, Object.assign({ ang: this.ang + Math.PI }, o)) };
    return B.b;
  },
  /* a spring (THE KIT's hlSpring): set .to in hlSkinTick, read .v anywhere */
  spring(key, v = 0, k = 140, d = 16) {
    return this.springs[key] || (this.springs[key] = hlSpring(v, k, d));
  },

  /* ---- odds and ends ----------------------------------------------------- */
  /* 0..1, the same for the same object every time it is asked (a round, a
     body, a moment), or hlHash of a number */
  seed(o) {
    if (typeof o === 'number') return hlHash(o);
    if (!o || typeof o !== 'object') return 0.5;
    let v = this._seed.get(o);
    if (v === undefined) { v = Math.random(); this._seed.set(o, v); }
    return v;
  },
  /* the trail as points, newest first, from where the pilot is now: each
     { x, y, age, k (0 now → 1 oldest), speed, dash }. With a socket, the
     points are where that socket was (a wingtip ribbon: me.trailPts('tipL')). */
  trailPts(sock, maxAge) {
    const T = this.trail, max = maxAge || this.look.trail || HL_WR.trail, out = [];
    const l = sock ? this.sockL(sock) : null;
    const at = (x, y, a) => l ? { x: x + l[0] * Math.cos(a) - l[1] * Math.sin(a),
                                  y: y + l[0] * Math.sin(a) + l[1] * Math.cos(a) } : { x, y };
    const h = at(this.x, this.y, this.ang);
    out.push({ x: h.x, y: h.y, age: 0, k: 0, speed: this.speed, dash: this.dashing });
    for (let i = T.length - 1; i >= 0; i--) {
      const q = T[i], age = this.clock - q.t;
      if (age > max) break;
      const p = at(q.x, q.y, q.ang);
      out.push({ x: p.x, y: p.y, age, k: age / max, speed: q.speed, dash: q.dash });
    }
    return out;
  },
  ribbon(pts, o) { return hlWrRibbon(pts, o); },
  lamp(x, y, r, col, a, flick, seed) { return hlWrLamp(x, y, r, col, a, flick, seed); },
  /* a real light, with shadows. Only inside hlSkinLights, which is only
     called in a room the kit lights. */
  light(o) { return hlLight(o); }
};

/* ================================ THE ENGINE ================================ */
/* Every call into the art goes through here. A hook that throws is switched
   off (until the art is reloaded and it is a new function) rather than
   taking the frame down with it: the game drops a frame that throws, so one
   bad line in a skin would otherwise stop the run. */
const _hlWrBad = new WeakSet();
function hlWrCall(fn, a, b, c, d) {
  if (typeof fn !== 'function' || _hlWrBad.has(fn)) return undefined;
  try { return fn(a, b, c, d); }
  catch (err) {
    _hlWrBad.add(fn);
    console.error('THE WARDROBE: ' + (fn.name || 'a hook') + ' threw, and is off until the art is reloaded.', err);
    return undefined;
  }
}

function hlWrLook(me) {
  me._lookFn = typeof hlSkinLook === 'function' ? hlSkinLook : null;
  const look = hlWrCall(hlSkinLook, me) || {};
  me.look = look;
  me._kinds = look.kinds ? Object.assign({}, HL_PART, look.kinds) : HL_PART;
}
/* Puts a skin on the wearer. A different skin starts clean (and says so,
   through hlSkinEquipFx, unless quiet); the same skin on a different pilot
   keeps its art and re-hangs its ropes on the new hull's sockets. */
function hlWrDress(me, s, pilot, quiet) {
  pilot = pilot || 'runner';
  const same = !!(me.s && s && me.s.id === s.id);
  const moved = me.pilot !== pilot;
  me.s = s || null; me.id = s ? s.id : ''; me.fx = s ? s.fx : '';
  me.tier = s ? (s.tier | 0) : 0; me.col = (s && s.col) || '#ffffff';
  me.pilot = pilot;
  if (!same) {
    me.art = {}; me.bodies = {}; me.springs = {}; me._acc = {};
    me.moments.length = 0; me.parts.length = 0;
  } else if (moved) me.bodies = {};
  hlWrLook(me);
  if (!same && !quiet) hlWrOn(me, 'equip');
}
/* A new run: the trail, the rounds, the moments and the bodies go; me.art
   stays (hlSkinRunFx is where the art resets its own). */
function hlWrReset(me) {
  me.trail.length = 0; me.rounds.clear(); me.moments.length = 0; me.parts.length = 0;
  me.bodies = {}; me._acc = {};
  me.streak = 0; me.best = 0; me.heat = 0; me.pulse = 0; me.idle = 0; me.age = 0;
  me.low = false; me.lowK = 0;
  for (const k of HL_WR_SINCE) me.since[k] = 99;
  for (const k in me._sp) me._sp[k].snap(0);
  for (const k in me.springs) me.springs[k].snap(me.springs[k].to);
}

/* Once a frame, after the source has written the pilot's state. */
function hlWrStep(me, dt) {
  dt = clamp(dt || 0, 0, 0.1);
  me.dt = dt; me.t = uiTime; me.clock += dt; me.age += dt;
  // the art arrived, or was reloaded: ask it for the look again
  if (me._lookFn !== (typeof hlSkinLook === 'function' ? hlSkinLook : null)) hlWrLook(me);
  for (const k in me.since) me.since[k] += dt;

  // motion, read off what the source wrote
  const sp = Math.hypot(me.vx, me.vy);
  me.speed = sp;
  if (sp > 8) me.dir = Math.atan2(me.vy, me.vx);
  let da = me.ang - me._ang0;
  da = Math.atan2(Math.sin(da), Math.cos(da));
  me._ang0 = me.ang;
  if (dt > 0) me.turn = lerp(me.turn, da / dt, 1 - Math.exp(-dt * 14));
  me.stretch = hlStretch(sp);
  me.hpK = me.maxHp > 0 ? clamp(me.hp / me.maxHp, 0, 1) : 0;
  me.firing = me.since.shot < 0.3;
  me.idle = sp < 20 && !me.firing && !me.dashing ? me.idle + dt : 0;

  // secondary motion the art gets for nothing
  const S = me._sp;
  S.lean.to = clamp(me.turn * 0.22, -1, 1); me.lean = S.lean.step(dt);
  me.recoil = S.recoil.step(dt);
  me.flinch = S.flinch.step(dt);
  S.low.to = me.low ? 1 : 0; me.lowK = clamp(S.low.step(dt), 0, 1);
  S.idle.to = me.idle > 0.8 ? 1 : 0;
  me.bob = Math.sin(me.clock * 1.8) * clamp(S.idle.step(dt), 0, 1);
  me.pulse = Math.max(0, me.pulse - dt * 2.4);
  if (me.since.kill > HL_WR.heat.hold) me.heat = Math.max(0, me.heat - HL_WR.heat.decay * dt);
  if (me.since.kill > (me.look.streakGap || HL_WR.streakGap)) me.streak = 0;

  hlWrTrailStep(me);
  hlWrCall(hlSkinTick, me, dt);          // the art's own clock
  hlWrBodiesStep(me, dt);
  hlWrPartsStep(me, dt);
  for (let i = me.moments.length - 1; i >= 0; i--) {
    const m = me.moments[i];
    m.age += dt; m.k = clamp(m.age / (m.dur || 1), 0, 1);
    if (m.follow) { m.x = me.x; m.y = me.y; m.ang = me.ang; }
    if (m.tl) m.tl.tick(dt);
    if (m.age >= m.dur) me.moments.splice(i, 1);
  }
  for (const R of me.rounds.values()) R.age += dt;
}

function hlWrTrailStep(me) {
  const T = me.trail, keep = me.look.trail || HL_WR.trail, gap = me.look.trailGap || HL_WR.trailGap;
  let last = T[T.length - 1];
  // a jump (a new room, a teleport) is not a stroke across the arena
  if (last && Math.hypot(me.x - last.x, me.y - last.y) > 240) { T.length = 0; last = null; }
  if (!last || Math.hypot(me.x - last.x, me.y - last.y) >= gap || (me.dashing && !last.dash))
    T.push({ x: me.x, y: me.y, ang: me.ang, t: me.clock, speed: me.speed, dash: me.dashing });
  let cut = 0;
  while (cut < T.length && me.clock - T[cut].t > keep) cut++;
  if (cut) T.splice(0, cut);
  if (T.length > 400) T.splice(0, T.length - 400);
}

function hlWrClothLay(me, B, all) {
  const b = B.b, o = B.o, l = me.sockL(B.sock), cols = b.cols, seg = b.seg;
  const rot = o.rot || 0, cr = Math.cos(rot), sr = Math.sin(rot);
  for (let i = 0; i < b.p.length; i++) {
    const q = b.p[i];
    if (!all && !q.pin) continue;
    const c = i % cols, r = (i / cols) | 0;
    const along = -r * seg * (o.squash || 1), across = (c - (cols - 1) / 2) * seg * (o.spread || 1);
    const w = me.local(l[0] + along * cr - across * sr, l[1] + along * sr + across * cr);
    q.x = w.x; q.y = w.y;
    if (all) { q.px = w.x; q.py = w.y; }
  }
}
function hlWrBodiesStep(me, dt) {
  if (dt > 0) for (const key in me.bodies) {
    const B = me.bodies[key], o = B.o;
    if (B.kind === 'chain') {
      const p = me.sock(B.sock);
      B.b.step(p.x, p.y, me.ang + Math.PI + (o.rot || 0), dt);
      continue;
    }
    const dr = o.drag ?? me.look.drag ?? 1.2, st = o.settle ?? me.look.settle ?? 60;
    const fl = o.flutter ?? 40, seed = B.seed ?? (B.seed = Math.random() * 99);
    const ax = -me.vx * dr - Math.cos(me.ang) * st, ay = -me.vy * dr - Math.sin(me.ang) * st;
    const wind = (x, y) => [ax + (hlNoise(uiTime * 2.3 + x * 0.03 + seed, 21) - 0.5) * fl,
                            ay + (hlNoise(uiTime * 2.3 + y * 0.03 + seed, 22) - 0.5) * fl];
    if (B.kind === 'rope') { const p = me.sock(B.sock); hlVPin(B.b, 0, p.x, p.y); }
    else hlWrClothLay(me, B, false);
    hlVStep(B.b, dt, wind);
    if (o.behind ?? B.kind === 'cloth') hlWrBehind(me, B);
  }
  for (const k in me.springs) me.springs[k].step(dt);
}
/* Keeps a body astern of its socket. Seen from above, a cape the hull spins
   through half a turn folds into its own mirror image, and nothing in a flat
   verlet sheet can pull it back through the pin line: so nothing free is let
   past that line. A hard turn drags it round the stern instead, the way it
   reads. On for cloth; o.behind: true puts a rope under the same rule. */
function hlWrBehind(me, B) {
  const p = me.sock(B.sock), a = me.ang + (B.o.rot || 0), c = Math.cos(a), s = Math.sin(a);
  const lim = -(B.o.gap ?? 0.5);
  for (const q of B.b.p) {
    if (q.pin) continue;
    const lx = (q.x - p.x) * c + (q.y - p.y) * s;
    if (lx <= lim) continue;
    const d = lx - lim;
    q.x -= c * d; q.y -= s * d; q.px -= c * d; q.py -= s * d;
  }
}

function hlWrPartsStep(me, dt) {
  const Q = me.parts, K = me._kinds;
  let j = 0;
  for (let i = 0; i < Q.length; i++) {
    const q = Q[i], k = K[q.kind];
    q.life -= dt;
    if (q.life <= 0 || !k) continue;
    if (dt > 0) k.step(q, dt);
    Q[j++] = q;
  }
  Q.length = j;
}
function hlWrPartsDraw(me, layer) {
  if (!me.parts.length) return;
  const K = me._kinds;
  ctx.save();
  if (layer === 'glow') ctx.globalCompositeOperation = 'lighter';
  for (const q of me.parts) {
    const k = K[q.kind];
    if (!k || (k.layer || 'glow') !== layer) continue;
    k.draw(q, me);
  }
  ctx.restore();
}

/* ---- what happened ---------------------------------------------------------
   The source reports; the wardrobe keeps the clocks and springs and calls
   the art's Fx hook. me.since[ev] is 0 at the moment, for every event. */
function hlWrOn(me, ev, a, b) {
  me.since[ev] = 0;
  switch (ev) {
    case 'equip':   hlWrCall(hlSkinEquipFx, me); break;
    case 'run':     hlWrCall(hlSkinRunFx, me); break;
    case 'hurt':    me._sp.flinch.kick(70 + Math.min(4, a || 1) * 25); hlWrCall(hlSkinHurtFx, me, a || 0); break;
    case 'heal':    hlWrCall(hlSkinHealFx, me, a || 0); break;
    case 'shield':  hlWrCall(hlSkinShieldFx, me, a | 0, !!b); break;
    case 'dash':
      me.dashX = a ?? Math.cos(me.ang); me.dashY = b ?? Math.sin(me.ang);
      hlWrCall(hlSkinDashFx, me, me.dashX, me.dashY); break;
    case 'dashEnd': hlWrCall(hlSkinDashEndFx, me); break;
    case 'parry':   if (a) me.since.perfect = 0; hlWrCall(hlSkinParryFx, me, !!a); break;
    case 'level':   hlWrCall(hlSkinLevelFx, me, a | 0); break;
    case 'wave':    hlWrCall(hlSkinWaveFx, me, a | 0); break;
    case 'low':     me.low = !!a; hlWrCall(hlSkinLowFx, me, !!a); break;
    case 'down':    hlWrCall(hlSkinDownFx, me, !!a); break;
    case 'death':   hlWrCall(hlSkinDeathFx, me); break;
  }
}
/* A body put down by the pilot. o carries what the source knows: ang (the
   killing blow's direction), boss, elite. */
function hlWrKill(me, e, o = {}) {
  const H = HL_WR.heat, gap = me.look.streakGap || HL_WR.streakGap;
  me.streak = me.since.kill <= gap ? me.streak + 1 : 1;
  me.best = Math.max(me.best, me.streak);
  me.since.kill = 0;
  me.pulse = Math.min(1.5, me.pulse + 0.6);
  me.heat = Math.min(1, me.heat + (o.boss ? H.boss : o.elite ? H.elite : H.kill));
  const info = Object.assign({ x: e.x, y: e.y, r: e.r || 12, col: e.col || '#ffffff', ang: 0,
                               boss: false, elite: false, type: e.type || '', sides: e.sides || 0 }, o);
  info.streak = me.streak;
  hlWrCall(hlSkinKillFx, me, e, info);
  if ((me.look.streaks || HL_WR.streaks).indexOf(me.streak) >= 0) {
    me.since.streak = 0;
    hlWrCall(hlSkinStreakFx, me, me.streak);
  }
}

/* ---- rounds ------------------------------------------------------------------
   Each round the pilot has in the air gets a record R, made the first time
   the wardrobe sees it and dropped the frame it is gone:
     R.b the round · R.seed · R.age · R.dist (px flown) · R.x0, R.y0 (born)
     R.x, R.y, R.ang · R.crit · R.mine (fired by the pilot, not a hacked one)
     R.kind 'plain' | 'crit' | 'venom' | 'solar' | 'deep' | 'hacked' · R.art
   Arrows are never dressed: their silhouette is information (a zodiac pilot
   reads their own volley by it), and the game's rule is that no skin takes
   that away. */
function hlWrRound(me, b) {
  const R = { b, seed: Math.random(), age: 0, dist: 0, x0: b.x, y0: b.y, x: b.x, y: b.y,
              ang: Math.atan2(b.vy || 0, b.vx || 1), crit: !!b.crit, mine: b.mine !== false && !b.hacked,
              kind: b.hacked ? 'hacked' : b.venom ? 'venom' : b.solar ? 'solar' : b.deep ? 'deep'
                  : b.crit ? 'crit' : 'plain',
              said: false, tick: 0, art: {} };
  me.rounds.set(b, R);
  return R;
}
/* Once a frame, with every round in the air: announces the new ones
   (hlSkinShotFx each, hlSkinVolleyFx once) and the ones that are gone
   (hlSkinRoundEndFx: 'hit' while it still had life, 'spent' if it ran out).
   A floor cleared of rounds all at once (a new room) is not forty endings. */
function hlWrRoundsSync(me, list, quiet) {
  const tick = ++me._rt;
  let fresh = 0, crits = 0;
  for (const b of list) {
    if (b.arrow) continue;
    const R = me.rounds.get(b) || hlWrRound(me, b);
    R.tick = tick;
    R.dist += Math.hypot(b.x - R.x, b.y - R.y);
    R.x = b.x; R.y = b.y;
    if (b.vx || b.vy) R.ang = Math.atan2(b.vy, b.vx);
    if (!R.said) {
      R.said = true;
      if (R.mine && !quiet) { fresh++; if (R.crit) crits++; hlWrCall(hlSkinShotFx, me, b, R); }
    }
  }
  let gone = 0;
  for (const R of me.rounds.values()) if (R.tick !== tick) gone++;
  if (gone) {
    const mass = quiet || gone > 40;
    for (const [b, R] of me.rounds) {
      if (R.tick === tick) continue;
      me.rounds.delete(b);
      if (!mass && R.mine) hlWrCall(hlSkinRoundEndFx, me, R, b.life !== undefined && b.life <= 0 ? 'spent' : 'hit');
    }
  }
  if (fresh) {
    me.since.shot = 0;
    me._sp.recoil.kick(-HL_WR.recoil * Math.sqrt(fresh));
    me.heat = Math.min(1, me.heat + HL_WR.heat.shot * fresh);
    hlWrCall(hlSkinVolleyFx, me, fresh, crits);
  }
}

/* ================================ THE PASSES ================================
   Called by the source from where it draws. World passes are in world
   coordinates with the camera applied; the screen pass is in CSS pixels. */
function hlWrMoments(me, layer) {
  for (const m of me.moments) {
    if (m.layer !== layer) continue;
    ctx.save(); hlWrCall(hlSkinMoment, me, m); ctx.restore();
  }
}
/* under everything of the pilot's: its trail, its lit particles, 'back' moments */
function hlWrDrawUnder(me) {
  ctx.save(); hlWrCall(hlSkinTrail, me); ctx.restore();
  hlWrPartsDraw(me, 'lit');
  hlWrMoments(me, 'back');
}
/* just before the hull */
function hlWrDrawBack(me) { ctx.save(); hlWrCall(hlSkinBack, me); ctx.restore(); }
/* in place of the hull: true if the art drew one */
function hlWrDrawSwap(me) { return !!me.inHull(() => hlWrCall(hlSkinHullSwap, me)); }
/* over the finished hull: true if the art drew anything (else the stock rim) */
function hlWrDrawOn(me) {
  const a = me.inHull(() => hlWrCall(hlSkinHull, me));
  ctx.save(); const b = hlWrCall(hlSkinFront, me); ctx.restore();
  hlWrMoments(me, 'front');
  if (HL_WR.debug) hlWrDebug(me);
  return !!(a || b);
}
function hlWrDrawGhost(me, g, f) {
  ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.ang || 0);
  const r = hlWrCall(hlSkinGhost, me, g, f);
  ctx.restore();
  return !!r;
}
function hlWrDrawRound(me, b, c) {
  const R = me.rounds.get(b) || hlWrRound(me, b);
  ctx.save(); const r = hlWrCall(hlSkinRound, me, b, c, R); ctx.restore();
  return !!r;
}
function hlWrDrawDebris(me, p, t, rad) {
  ctx.save(); const r = hlWrCall(hlSkinDebris, me, p, t, rad); ctx.restore();
  return !!r;
}
function hlWrDrawBody(me, e, ea) {
  ctx.save(); hlWrCall(hlSkinBody, me, e, ea === undefined ? 1 : ea); ctx.restore();
}
/* the additive pass, over everything in the world */
function hlWrDrawGlow(me) {
  hlWrPartsDraw(me, 'glow');
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; hlWrCall(hlSkinGlow, me); ctx.restore();
  hlWrMoments(me, 'glow');
}
function hlWrDrawScreen(me) {
  ctx.save(); hlWrCall(hlSkinScreen, me); ctx.restore();
  hlWrMoments(me, 'screen');
}
function hlWrDrawLights(me) { hlWrCall(hlSkinLights, me); }

/* ================================ THE TOOLS ================================= */
/* A ribbon through points (me.trailPts gives the right shape), tapering from
   w0 at the head to w1 at the tail and fading a0 → a1.
     o: { w0, w1, a0, a1, col, ease, comp, wob, wobSpd, seed, edge, edgeA, lw, quads }
   One fill with a gradient by default; quads: true shades segment by segment
   (for a trail that curls back on itself). */
function hlWrRibbon(pts, o = {}) {
  const n = pts.length;
  if (n < 2) return;
  const w0 = o.w0 ?? 6, w1 = o.w1 ?? 0, a0 = o.a0 ?? 1, a1 = o.a1 ?? 0;
  const col = o.col || '#ffffff', ease = o.ease || 'lin', wob = o.wob || 0, seed = o.seed || 0;
  const L = [], R = [];
  for (let i = 0; i < n; i++) {
    const p = pts[i], a = pts[i > 0 ? i - 1 : 0], c = pts[i < n - 1 ? i + 1 : n - 1];
    let tx = c.x - a.x, ty = c.y - a.y;
    const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    const k = p.k !== undefined ? p.k : i / (n - 1);
    let w = lerp(w0, w1, hlEase(ease, k)) / 2;
    if (wob) w *= Math.max(0, 1 + (hlNoise(k * 7 - uiTime * (o.wobSpd || 3), seed) - 0.5) * 2 * wob);
    L.push(p.x - ty * w, p.y + tx * w); R.push(p.x + ty * w, p.y - tx * w);
  }
  ctx.save();
  if (o.comp) ctx.globalCompositeOperation = o.comp;
  if (o.quads) {
    for (let i = 0; i < n - 1; i++) {
      const k = pts[i].k !== undefined ? (pts[i].k + pts[i + 1].k) / 2 : (i + 0.5) / (n - 1);
      ctx.fillStyle = rgba(col, lerp(a0, a1, k));
      ctx.beginPath();
      ctx.moveTo(L[i * 2], L[i * 2 + 1]); ctx.lineTo(L[i * 2 + 2], L[i * 2 + 3]);
      ctx.lineTo(R[i * 2 + 2], R[i * 2 + 3]); ctx.lineTo(R[i * 2], R[i * 2 + 1]);
      ctx.closePath(); ctx.fill();
    }
  } else {
    const h = pts[0], t = pts[n - 1];
    if (Math.hypot(t.x - h.x, t.y - h.y) < 1) ctx.fillStyle = rgba(col, a0);
    else {
      const g = ctx.createLinearGradient(h.x, h.y, t.x, t.y);
      g.addColorStop(0, rgba(col, a0)); g.addColorStop(1, rgba(col, a1));
      ctx.fillStyle = g;
    }
    ctx.beginPath(); ctx.moveTo(L[0], L[1]);
    for (let i = 1; i < n; i++) ctx.lineTo(L[i * 2], L[i * 2 + 1]);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(R[i * 2], R[i * 2 + 1]);
    ctx.closePath(); ctx.fill();
    if (o.edge) { ctx.strokeStyle = rgba(o.edge, o.edgeA ?? 0.6); ctx.lineWidth = o.lw || 1; ctx.stroke(); }
  }
  ctx.restore();
}

/* A lamp: the kit's light falloff laid on additively, with its flicker. It
   brightens, it cannot darken — the look of a light anywhere the room has no
   light pass (an ordinary run, the menu). Returns the flicker it drew with,
   so a flame can breathe in step with its own glow. */
function hlWrLamp(x, y, r, col, a = 1, flick = 0, seed = 0) {
  const f = flick ? hlFlicker(uiTime, seed, flick) : 1;
  const rr = r * (flick ? 0.93 + 0.09 * f : 1);
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.globalAlpha = clamp(a * f, 0, 1);
  ctx.drawImage(hlLightSprite(col), x - rr, y - rr, rr * 2, rr * 2);
  ctx.restore();
  return f;
}

/* Sprites made once and stamped after: anything expensive that does not
   change frame to frame (a carved face with its gradients, a lantern's
   cage). draw(g, w, h) gets its own context with the origin at the sprite's
   centre, in the same units hlWrBlit will draw it in (res is its
   sharpness). Make them in hlSkinPreload so the first frame does not pay. */
const _hlWrSpr = new Map();
function hlWrSprite(key, w, h, draw, res = 2) {
  let s = _hlWrSpr.get(key);
  if (s) return s;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w * res)); c.height = Math.max(1, Math.ceil(h * res));
  const g = c.getContext('2d');
  g.scale(res, res); g.translate(w / 2, h / 2);
  try { draw(g, w, h); } catch (err) { console.error('THE WARDROBE: sprite ' + key + ' failed.', err); }
  s = { c, w, h, res };
  _hlWrSpr.set(key, s);
  return s;
}
function hlWrBlit(key, x, y, ang = 0, sc = 1, a = 1) {
  const s = _hlWrSpr.get(key);
  if (!s) return false;
  ctx.save();
  ctx.translate(x, y);
  if (ang) ctx.rotate(ang);
  if (a !== 1) ctx.globalAlpha *= a;
  ctx.drawImage(s.c, -s.w / 2 * sc, -s.h / 2 * sc, s.w * sc, s.h * sc);
  ctx.restore();
  return true;
}
function hlWrUnsprite(key) { if (key) _hlWrSpr.delete(key); else _hlWrSpr.clear(); }

/* The art's list of things to make ahead, run one per idle moment the first
   time each skin is worn on each pilot (and again when the art changes). */
const _hlWrPrep = new WeakMap();
function hlWrPreload(me) {
  const fn = typeof hlSkinPreload === 'function' ? hlSkinPreload : null;
  if (!fn || fn.hlStock || !me.s) return 0;
  let done = _hlWrPrep.get(fn);
  if (!done) _hlWrPrep.set(fn, done = new Set());
  const key = me.id + '|' + me.pilot;
  if (done.has(key)) return 0;
  done.add(key);
  const jobs = (hlWrCall(fn, me) || []).slice();
  const n = jobs.length;
  const idle = typeof requestIdleCallback === 'function'
    ? f => requestIdleCallback(f, { timeout: 1200 }) : f => setTimeout(f, 40);
  const step = () => {
    const j = jobs.shift();
    if (!j) return;
    try { j(); } catch (err) { console.error('THE WARDROBE: a preload job failed.', err); }
    idle(step);
  };
  idle(step);
  return n;
}

/* The game's own hull, drawn the way drawPlayer draws it (glow off the edge,
   the plating, the canopy), for the stage and the harness. In hull space. */
function hlWrStockHull(me, col) {
  col = col || me.hullCol || me.col;
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 5; i >= 1; i--) {
    ctx.lineWidth = 2.4 + i * 3.4;
    ctx.strokeStyle = rgba(col, 0.055 * (1 - i / 6.5) + 0.012);
    hullPath(me.pilot); ctx.stroke();
  }
  ctx.globalCompositeOperation = 'source-over';
  ctx.lineWidth = 2.4; ctx.strokeStyle = col; ctx.fillStyle = rgba(col, 0.18);
  hullPath(me.pilot); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#e0f2fe';
  ctx.beginPath(); ctx.arc(me.sockL('canopy')[0], 0, 2.6, 0, TAU); ctx.fill();
  ctx.restore();
}
/* What an awarded skin draws when its art has nothing yet: the stock rim. */
function hlWrStockRim(me) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = rgba(me.col, 0.22 + Math.sin(uiTime * 2.2) * 0.09);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(me.x, me.y, me.R, 0, TAU); ctx.stroke();
  ctx.restore();
}

/* Sockets, the trail, the managed bodies, the springs and the moments, over
   the pilot (HL_WR.debug; the admin panel's DEBUG, the harness's). */
function hlWrDebug(me) {
  ctx.save();
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1; ctx.setLineDash([]);
  const pts = me.trailPts(null);
  ctx.strokeStyle = 'rgba(56,189,248,0.7)'; ctx.lineWidth = 0.8;
  ctx.beginPath();
  pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y));
  ctx.stroke();
  for (const p of pts) { ctx.fillStyle = 'rgba(56,189,248,0.8)'; ctx.fillRect(p.x - 0.6, p.y - 0.6, 1.2, 1.2); }
  for (const key in me.bodies) {
    const B = me.bodies[key], P2 = B.kind === 'chain' ? B.b.pts : B.b.p;
    ctx.fillStyle = 'rgba(167,139,250,0.9)';
    for (const q of P2) ctx.fillRect(q.x - 0.8, q.y - 0.8, 1.6, 1.6);
  }
  ctx.font = "600 5.5px 'JetBrains Mono', ui-monospace, monospace";
  ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  const T = HL_WR_SOCK[me.pilot] || HL_WR_SOCK.runner;
  for (const k of Object.keys(T).concat(['above', 'below'])) {
    const p = me.sock(k);
    ctx.fillStyle = '#fbbf24'; ctx.fillRect(p.x - 1.1, p.y - 1.1, 2.2, 2.2);
    ctx.fillStyle = 'rgba(253,230,138,0.75)'; ctx.fillText(k, p.x + 2.5, p.y);
  }
  for (const m of me.moments) {
    ctx.strokeStyle = 'rgba(244,114,182,0.7)'; ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.arc(m.x, m.y, 5 + m.k * 9, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(251,207,232,0.85)';
    ctx.fillText(m.name + ' ' + m.k.toFixed(2) + ' ' + m.layer, m.x + 6, m.y - 8);
  }
  const L = [me.id + ' · ' + me.pilot + ' · ' + me.where + (me.lit ? ' · lit' : ''),
             'spd ' + me.speed.toFixed(0) + '  turn ' + me.turn.toFixed(2) + '  lean ' + me.lean.toFixed(2),
             'recoil ' + me.recoil.toFixed(1) + '  flinch ' + me.flinch.toFixed(1) + '  bob ' + me.bob.toFixed(2),
             'heat ' + me.heat.toFixed(2) + '  pulse ' + me.pulse.toFixed(2) + '  streak ' + me.streak + ' (' + me.best + ')',
             'hp ' + me.hpK.toFixed(2) + '  low ' + me.lowK.toFixed(2) + '  idle ' + me.idle.toFixed(1),
             'moments ' + me.moments.length + '  parts ' + me.parts.length + '  rounds ' + me.rounds.size];
  ctx.fillStyle = 'rgba(4,8,14,0.72)';
  ctx.fillRect(me.x + me.R + 8, me.y - 24, 118, L.length * 7 + 4);
  ctx.fillStyle = '#cbd5e1';
  L.forEach((s, i) => ctx.fillText(s, me.x + me.R + 11, me.y - 20 + i * 7));
  ctx.restore();
}

/* ================================ THE STAGE =================================
   A puppet in a box: it flies a lazy figure of eight, turns to the nearest
   body, fires, and every body it puts down is a real kill as far as the
   wearer is concerned (streaks, heat, hlSkinKillFx). Now and then it dashes
   and levels. Drawn through every hook the run uses, in the run's order.

     hlWrStage(s, pilot, { mode, zoom, auto })  → st
       mode 'card'   the menu: two bodies, an easy pace
            'plate'  a close-up: held nearly still, one body, slow fire
            'arena'  the bench: four bodies closing in, fast fire
     hlWrStageTick(st, dt) then hlWrStageDraw(st, box) — box in the canvas's
     current units. st.speed, st.paused, st.auto (the stage's own dashes and
     levels), st.lit (the kit's light pass under the rounds: the harness only,
     since it multiplies the whole canvas), st.hurtEvery (seconds, 0 = never).
     hlWrStageFire(st, ev) does one event now: 'dash', 'level', 'hurt',
     'heal', 'shield', 'parry', 'perfect', 'kill', 'streak', 'boss',
     'elite', 'low', 'down', 'death', 'wave', 'equip', 'run', 'volley'.
=========================================================================== */
const HL_WR_STAGE_COLS = ['#f43f5e', '#22d3ee', '#a3e635', '#f97316', '#e879f9', '#38bdf8'];

function hlWrStage(s, pilot, o = {}) {
  const me = hlWrWearer(o.where || 'stage');
  me.scene = 'stage';
  const st = { me, s, pilot: pilot || 'runner', mode: o.mode || 'card', zoom: o.zoom || 1.6,
               auto: o.auto !== false, speed: 1, paused: false, lit: false, hurtEvery: 0,
               clock: 0, lastT: null, ww: 200, wh: 120, rounds: [], dummies: [], pops: [],
               debris: [], ghosts: [], ghostT: 0,
               lvl: 1, wave: 1, dash: 0, dx: 0, dy: 0, fireCd: 0.6, dashCd: 3.4, levelCd: 8.5,
               hurtCd: 0, queue: [], shield: 0 };
  me.hp = me.maxHp = 10;
  hlWrDress(me, s, st.pilot, true);
  return st;
}
function hlWrStageDress(st, s, pilot) {
  st.s = s; st.pilot = pilot || st.pilot;
  hlWrDress(st.me, s, st.pilot);
}
function hlWrStageBody(st) {
  const a = rnd(-0.9, 0.9), plate = st.mode === 'plate';
  const x = st.ww * (plate ? 0.8 : 0.78 + rnd(0.14, 0)), y = st.wh * (0.5 + a * 0.38);
  return { x, y, r: plate ? 13 : rnd(15, 9), sides: 3 + ((Math.random() * 4) | 0), ang: rnd(TAU),
           spin: rnd(1, -1), col: HL_WR_STAGE_COLS[(Math.random() * HL_WR_STAGE_COLS.length) | 0],
           hp: plate ? 4 : 3, flash: 0, fade: 0, vx: 0, vy: 0, type: 'stage', stage: true };
}
function hlWrStageFire(st, ev) {
  const me = st.me;
  switch (ev) {
    case 'dash':    st.dash = 0.17; hlWrOn(me, 'dash', Math.cos(me.ang), Math.sin(me.ang)); break;
    case 'level':   hlWrOn(me, 'level', ++st.lvl); break;
    case 'wave':    hlWrOn(me, 'wave', ++st.wave); break;
    case 'hurt':    me.hp = Math.max(1, me.hp - 2); me.hurt = 0.5; hlWrOn(me, 'hurt', 2); break;
    case 'heal':    { const a = me.maxHp - me.hp; me.hp = me.maxHp; hlWrOn(me, 'heal', a || 2); break; }
    case 'shield':  st.shield = st.shield ? 0 : 2; hlWrOn(me, 'shield', st.shield, st.shield > 0); break;
    case 'parry':   hlWrOn(me, 'parry', false); break;
    case 'perfect': hlWrOn(me, 'parry', true); break;
    case 'low':     { me.hp = me.low ? me.maxHp : me.maxHp * 0.2; hlWrOn(me, 'low', !me.low); break; }
    case 'down':    me.down = !me.down; hlWrOn(me, 'down', me.down); break;
    case 'death':   hlWrOn(me, 'death'); break;
    case 'equip':   hlWrOn(me, 'equip'); break;
    case 'run':     hlWrOn(me, 'run'); break;
    case 'volley':  st.fireCd = 0; st.burst = 5; break;
    case 'kill': case 'elite': case 'boss': case 'streak': {
      const n = ev === 'streak' ? 10 : 1;
      for (let i = 0; i < n; i++) {
        const e = (i === 0 && st.dummies.find(z => !z.dead)) || hlWrStageBody(st);
        if (ev === 'boss') e.r = 30;
        hlWrStageKill(st, e, { boss: ev === 'boss', elite: ev === 'elite' });
      }
      break;
    }
  }
}
/* sparks, shaped like the game's own particles, so hlSkinDebris has them to dress */
function hlWrStageSpark(st, x, y, col, n, sp) {
  for (let i = 0; i < n; i++) {
    const a = rnd(TAU), v = rnd(sp, sp * 0.25), life = rnd(0.8, 0.35);
    st.debris.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: rnd(2.6, 1.2),
                     color: col, life, max: life, drag: 0.9 });
  }
  if (st.debris.length > 500) st.debris.splice(0, st.debris.length - 500);
}
function hlWrStageKill(st, e, o) {
  e.dead = true;
  hlWrStageSpark(st, e.x, e.y, e.col, 22, 190);
  st.pops.push({ x: e.x, y: e.y, r: e.r, col: e.col, age: 0 });
  hlWrKill(st.me, e, Object.assign({ ang: Math.atan2(e.y - st.me.y, e.x - st.me.x) }, o || {}));
}
function hlWrStageTick(st, dt) {
  const me = st.me;
  dt = st.paused ? 0 : clamp(dt, 0, 0.1) * st.speed;
  st.clock += dt;
  const t = st.clock, ww = st.ww, wh = st.wh, plate = st.mode === 'plate', arena = st.mode === 'arena';
  const px = me.x, py = me.y;
  // where it flies: a figure of eight, pushed along by any dash, easing back
  const cx = ww * (plate ? 0.34 : 0.38), cy = wh * (plate ? 0.58 : 0.5);
  const dv = Math.min(760, Math.min(ww, wh) * 1.5);          // a dash sized to the box
  if (st.dash > 0) { st.dash -= dt; st.dx += Math.cos(me.ang) * dv * dt; st.dy += Math.sin(me.ang) * dv * dt; }
  else { const k = Math.exp(-dt * 2.2); st.dx *= k; st.dy *= k; }
  const edge = me.R * 0.9;
  me.x = clamp(cx + Math.sin(t * 0.55) * ww * (plate ? 0.02 : 0.18) + st.dx, edge, Math.max(edge, ww - edge));
  me.y = clamp(cy + Math.sin(t * 1.1) * wh * (plate ? 0.03 : 0.2) + st.dy + me.bob * 2, edge, Math.max(edge, wh - edge));
  if (dt > 0) { me.vx = (me.x - px) / dt; me.vy = (me.y - py) / dt; }
  me.dashing = st.dash > 0; me.dashK = me.dashing ? clamp(1 - st.dash / 0.17, 0, 1) : 0;
  me.shield = st.shield;
  // bodies: kept topped up, fading in, closing in on the arena
  const want = plate ? 1 : arena ? 4 : 2;
  st.dummies = st.dummies.filter(e => !e.dead);
  while (st.dummies.length < want) st.dummies.push(hlWrStageBody(st));
  let tgt = null, bd = 1e9;
  for (const e of st.dummies) {
    e.ang += e.spin * dt; e.flash = Math.max(0, e.flash - dt * 6); e.fade = Math.min(1, e.fade + dt * 1.6);
    if (arena) {
      const dx = me.x - e.x, dy = me.y - e.y, d = Math.hypot(dx, dy) || 1;
      e.vx += dx / d * 26 * dt * (d > 90 ? 1 : -2); e.vy += dy / d * 26 * dt * (d > 90 ? 1 : -2);
      e.vx *= 0.99; e.vy *= 0.99; e.x += e.vx * dt; e.y += e.vy * dt;
    } else e.y += Math.sin(t * 0.9 + e.x) * 4 * dt;
    const d = Math.hypot(e.x - me.x, e.y - me.y);
    if (e.fade > 0.5 && d < bd) { bd = d; tgt = e; }
  }
  // aim: at the nearest body, or along the way it is going
  const want2 = tgt ? Math.atan2(tgt.y - me.y, tgt.x - me.x) : me.dir;
  let da = want2 - me.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
  me.ang += da * Math.min(1, dt * 6);
  // fire
  st.fireCd -= dt;
  if (tgt && st.fireCd <= 0 && dt > 0) {
    st.fireCd = st.burst > 0 ? 0.06 : plate ? 0.42 : arena ? 0.14 : 0.24;
    if (st.burst > 0) st.burst--;
    const m = me.sock('muzzle'), sp = plate ? 300 : 520;
    st.rounds.push({ x: m.x, y: m.y, vx: Math.cos(me.ang) * sp, vy: Math.sin(me.ang) * sp,
                     r: 3.8, crit: Math.random() < 0.14, life: 1.4, mine: true });
  }
  for (const b of st.rounds) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
    if (b.life <= 0 || b.x < -30 || b.y < -30 || b.x > ww + 30 || b.y > wh + 30) { b.gone = true; continue; }
    for (const e of st.dummies) {
      if (e.dead || e.fade < 0.6 || Math.hypot(b.x - e.x, b.y - e.y) > e.r + b.r) continue;
      b.gone = true; e.hp--; e.flash = 1;
      hlWrStageSpark(st, b.x, b.y, b.crit ? '#fbbf24' : e.col, 6, 110);
      if (e.hp <= 0) st.queue.push(e);
      break;
    }
  }
  st.rounds = st.rounds.filter(b => !b.gone);
  for (const p of st.pops) p.age += dt;
  st.pops = st.pops.filter(p => p.age < 0.5);
  // the sparks, compacted in place (the harness hands this array to spawnPart)
  let j = 0;
  for (const q of st.debris) {
    q.x += q.vx * dt; q.y += q.vy * dt;
    const k = Math.pow(q.drag, dt * 60); q.vx *= k; q.vy *= k; q.life -= dt;
    if (q.life > 0) st.debris[j++] = q;
  }
  st.debris.length = j;
  // afterimages while it dashes, as the game leaves them
  st.ghostT -= dt;
  if (me.dashing && st.ghostT <= 0) { st.ghostT = 0.03; st.ghosts.push({ x: me.x, y: me.y, ang: me.ang, phase: false, age: 0 }); }
  for (const g of st.ghosts) g.age += dt;
  st.ghosts = st.ghosts.filter(g => g.age < 0.28);
  me.hurt = Math.max(0, me.hurt - dt);
  me.hullCol = me.hurt > 0 ? '#fecaca'
    : (me.s && me.s.base && me.s.base.player && me.s.base.player.col) || me.col;
  // its own clock, then what happened this frame
  me.live = !st.paused; me.t = uiTime;
  hlWrStep(me, dt);
  for (const e of st.queue) hlWrStageKill(st, e);
  st.queue.length = 0;
  if (st.auto && dt > 0) {
    if (!plate && (st.dashCd -= dt) <= 0) { st.dashCd = rnd(5.5, 3.5); hlWrStageFire(st, 'dash'); }
    if ((st.levelCd -= dt) <= 0) { st.levelCd = rnd(14, 10); hlWrStageFire(st, 'level'); }
    if (st.hurtEvery > 0 && (st.hurtCd += dt) >= st.hurtEvery) { st.hurtCd = 0; hlWrStageFire(st, 'hurt'); }
  }
  if (st._dashWas && !me.dashing) hlWrOn(me, 'dashEnd');
  st._dashWas = me.dashing;
  if (!me.low && me.hpK < HL_WR.lowIn && me.hpK > 0) hlWrOn(me, 'low', true);
  else if (me.low && me.hpK > HL_WR.lowOut) hlWrOn(me, 'low', false);
  hlWrRoundsSync(me, st.rounds, false);
}
function hlWrStageDraw(st, box) {
  const me = st.me, z = st.zoom;
  st.ww = box.w / z; st.wh = box.h / z;
  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  if (!hlWrCall(hlSkinStage, me, box)) {
    ctx.fillStyle = '#05070d'; ctx.fillRect(box.x, box.y, box.w, box.h);
    ctx.strokeStyle = 'rgba(148,163,184,0.05)'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = box.x; x < box.x + box.w; x += 32 * z) { ctx.moveTo(x, box.y); ctx.lineTo(x, box.y + box.h); }
    for (let y = box.y; y < box.y + box.h; y += 32 * z) { ctx.moveTo(box.x, y); ctx.lineTo(box.x + box.w, y); }
    ctx.stroke();
  }
  ctx.translate(box.x, box.y); ctx.scale(z, z);
  // the bodies, as the game draws them, then the skin's word on each
  for (const e of st.dummies) {
    ctx.save(); ctx.globalAlpha = e.fade;
    poly(e.x, e.y, e.r, e.sides, e.ang);
    ctx.fillStyle = rgba(e.col, 0.14); ctx.fill();
    ctx.lineWidth = 2; ctx.lineJoin = 'round'; ctx.strokeStyle = e.flash > 0.5 ? '#ffffff' : e.col; ctx.stroke();
    ctx.restore();
    hlWrDrawBody(me, e, e.fade);
  }
  // the pilot, in the run's order (a staged death leaves the hull out for a beat)
  me.hidden = me.since.death < 1.8;
  st.ghosts.forEach((g, i) => {
    const f = (i + 1) / st.ghosts.length;
    if (hlWrDrawGhost(me, g, f)) return;
    ctx.save(); ctx.translate(g.x, g.y); ctx.rotate(g.ang);
    ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.26 * f; ctx.lineWidth = 2;
    ctx.strokeStyle = me.hullCol; ctx.fillStyle = rgba(me.hullCol, 0.1);
    hullPath(me.pilot); ctx.fill(); ctx.stroke();
    ctx.restore();
  });
  hlWrDrawUnder(me);
  if (me.hidden) {}
  else if (!me.down) {
    hlWrDrawBack(me);
    if (!hlWrDrawSwap(me)) me.inHull(() => hlWrStockHull(me));
    if (!hlWrDrawOn(me)) hlWrStockRim(me);
  } else {
    ctx.save(); ctx.strokeStyle = rgba(me.col, 0.5); ctx.setLineDash([5, 6]); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(me.x, me.y, 17, 0, TAU); ctx.stroke(); ctx.restore();
  }
  // the light pass, where the harness asked for one: after the hull, before the rounds
  if (st.lit && typeof hlLightRender === 'function') {
    hlLightBegin('#0b0d18', 1);
    hlLight({ x: st.ww * 0.15, y: st.wh * 0.2, r: 260, col: '#fbbf24', a: 0.9, flick: 1, seed: 3, z: 40 });
    hlLight({ x: st.ww * 0.9, y: st.wh * 0.85, r: 220, col: '#fb923c', a: 0.7, flick: 1, seed: 7, z: 40 });
    for (const e of st.dummies) hlOccCircle(e.x, e.y, e.r * 0.8, 20);
    me.lit = true;
    hlWrDrawLights(me);
    hlLightRender();
  } else me.lit = false;
  // rounds and the glow pass, additive as in the run
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (const b of st.rounds) {
    const c = b.crit ? '#fbbf24' : (me.s && me.s.base && me.s.base.bullet && me.s.base.bullet.col) || me.col;
    if (hlWrDrawRound(me, b, c)) continue;
    drawGlow(b.x, b.y, b.r * 4.6, c, 0.72);
    ctx.fillStyle = c; ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, TAU); ctx.fill();
  }
  for (const q of st.debris) {
    const t = q.life / q.max, rad = q.r * 3.4 * (0.4 + t * 0.9);
    if (rad < 1.6 || hlWrDrawDebris(me, q, t, rad)) continue;
    drawGlow(q.x, q.y, rad, q.color, t * 0.6);
  }
  // the stage's own pop, only while the art has no kill of its own
  if (typeof hlSkinKillFx !== 'function' || hlSkinKillFx.hlStock) for (const p of st.pops) {
    const k = p.age / 0.5;
    ctx.strokeStyle = rgba(p.col, 0.6 * (1 - k)); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (1 + k * 1.6), 0, TAU); ctx.stroke();
  }
  ctx.restore();
  hlWrDrawGlow(me);
  ctx.restore();
}

/* The menu's showcases, one stage per skin, pilot and mode, ticked off
   uiTime the first time they are drawn in a frame. */
const _hlWrStages = new Map();
function hlWrShowcase(s, box, o = {}) {
  const key = s.id + '|' + (o.pilot || 'runner') + '|' + (o.mode || 'card');
  let st = _hlWrStages.get(key);
  if (!st) {
    st = hlWrStage(s, o.pilot, o);
    _hlWrStages.set(key, st);
    if (_hlWrStages.size > 8) _hlWrStages.delete(_hlWrStages.keys().next().value);
  }
  if (st.lastT !== uiTime) {
    const dt = st.lastT === null ? 0 : uiTime - st.lastT;
    st.lastT = uiTime;
    st.ww = box.w / st.zoom; st.wh = box.h / st.zoom;
    hlWrStageTick(st, dt);
  }
  hlWrStageDraw(st, box);
  return st;
}
/* Put on in the menu: every stage showing that skin plays its equip. */
function hlWrShowcaseEquip(s) {
  for (const st of _hlWrStages.values()) if (st.s && s && st.s.id === s.id) hlWrOn(st.me, 'equip');
}

/* ===========================================================================
   ALL HALLOWS · SKINS — art hooks
   The placeholders. hl-art.js replaces any of them by declaring a function of
   the same name, exactly as it does the Act I hooks (and the lift checks it
   the same way). Every hook is handed the wearer, `me`; the layers draw, the
   Fx hooks start things. HALLOWS-SKINS-GUIDE.txt has the full contract.

   Until the art is redrawn on these, five of them hand over to the 27 Sep
   prize hooks (hlSkinUnder/Player/Bullet/Part/Enemy, in the Act I block), so
   the look in a run is exactly what it was. That only happens where the
   global P is the wearer (me.real): the menu's stage shows the stock look
   until the art is on the new hooks.
=========================================================================== */
/* ---- the look, the clock ---- */
function hlSkinLook(me) { return {}; }          // { trail, trailGap, streakGap, streaks, drag, settle, kinds, …yours }
function hlSkinPreload(me) { return []; }       // [() => hlWrSprite(…), …]
function hlSkinTick(me, dt) {}                  // once a frame: your ropes' .to, springs, me.every emitters
/* ---- the layers ---- */
function hlSkinTrail(me) {}                     // world, under the pilot: me.trailPts, me.ribbon
function hlSkinBack(me) {                       // world, just before the hull: cloth, chains, the back glow
  if (me.real && typeof hlSkinUnder === 'function') hlSkinUnder(me.s);
}
function hlSkinHullSwap(me) { return false; }   // HULL SPACE; true = this is the hull (the stock one is not drawn)
function hlSkinHull(me) { return false; }       // HULL SPACE, over the finished hull; true = drew
function hlSkinFront(me) {                      // world, over the hull; true = drew (else the stock rim)
  return me.real && typeof hlSkinPlayer === 'function' ? hlSkinPlayer(me.s) : false;
}
function hlSkinGhost(me, g, f) { return false; }   // HULL SPACE at an afterimage; true = drew it
function hlSkinRound(me, b, c, R) {             // one round, whole (additive); true = drew
  return me.real && typeof hlSkinBullet === 'function' ? hlSkinBullet(b, c, me.s) : false;
}
function hlSkinDebris(me, p, t, rad) {          // one of the game's sparks; true = drew
  return me.real && typeof hlSkinPart === 'function' ? hlSkinPart(p, t, rad, me.s) : false;
}
function hlSkinBody(me, e, ea) {                // over each body of the roster (not bosses)
  if (me.real && typeof hlSkinEnemy === 'function') hlSkinEnemy(e, ea, me.s);
}
function hlSkinGlow(me) {}                      // world, additive, over everything
function hlSkinMoment(me, m) {}                 // each live moment, on its layer
function hlSkinScreen(me) {}                    // CSS px, over the world, under the HUD
function hlSkinLights(me) {}                    // in a lit room: me.light({…}) — real light, with shadows
function hlSkinStage(me, box) { return false; } // the menu stage's backdrop; true = drew
/* ---- the moments (once, when it happens) ---- */
function hlSkinEquipFx(me) {}                   // put on
function hlSkinRunFx(me) {}                     // a run begins wearing it
function hlSkinShotFx(me, b, R) {}              // a round leaves the hull
function hlSkinVolleyFx(me, n, crits) {}        // n rounds this frame (the muzzle)
function hlSkinRoundEndFx(me, R, how) {}        // a round is gone: 'hit' | 'spent'
function hlSkinKillFx(me, e, o) {}              // o: { x, y, r, col, ang, boss, elite, type, sides, streak }
function hlSkinStreakFx(me, n) {}               // the streak reached n (HL_WR.streaks)
function hlSkinHurtFx(me, dmg) {}
function hlSkinHealFx(me, amt) {}
function hlSkinShieldFx(me, n, up) {}           // shields now n; up: gained one
function hlSkinDashFx(me, dx, dy) {}
function hlSkinDashEndFx(me) {}
function hlSkinParryFx(me, perfect) {}          // THE VAGRANT turned a blow aside
function hlSkinLevelFx(me, lvl) {}
function hlSkinWaveFx(me, n) {}
function hlSkinLowFx(me, on) {}                 // health went under HL_WR.lowIn (on) / back over lowOut
function hlSkinDownFx(me, down) {}              // co-op: wrecked / back up
function hlSkinDeathFx(me) {}                   // the hull is gone; the run is over
for (const n of HL_WR_HOOKS) if (typeof globalThis[n] === 'function') globalThis[n].hlStock = true;
/* ===================== end of ALL HALLOWS · SKINS art hooks ===================== */
