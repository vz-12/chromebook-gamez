/* ===========================================================================
   VOIDRUNNER PvP — a match: with a friend (PVP-PLAN.md, Phase 3 step 2), or
   one the queue found (Phase 5 step 2)

   Two players, two machines, one run, on the game's own co-op stack as it
   is. The host opens a room and is given a code; the guest typed it in the
   lobby, or, in a queued match, asks the server's match for it. The engine's netHost / netJoin connect them through PvP's Worker
   (/api/room for the handshake, /api/turn for the relay, so it works on any
   network), both say hello, and the host starts the run: LOCKSTEP CO-OP,
   each machine flying its own pilot (TWO PILOTS), in an empty arena.

   The match itself, from the map's draw to the last round, is rounds.js's;
   this file is the connection around it, the waiting room before it and the
   result after it. The server's referee hears from referee.js, which this
   file starts, ticks and tells when the match is decided or left.

   Until the run starts, the engine sits in PvP's own state, 'pvp', where the
   run neither moves nor draws; this file shows the waiting room over it, in
   HTML. Once it ends, from either side, the room says so and leads back to
   the lobby.
   ========================================================================= */
(() => {
  'use strict';
  const M = window.VR_PVP;
  if (!M) return;

  let box = null, started = false, over = '';

  /* A match the queue found (pvp.js): the server made it with both sides in
     it, so its id, this machine's side, the rules it flies (the league's
     pilots and length) and both players' upgrades are the server's. The host
     opens a room and leaves its code with the match; the guest asks for it
     there, so nobody types one. A match not under way by CONNECT never will
     be: nothing is recorded, and both go back to queue again. */
  const Q = M.hand && M.hand.match && Array.isArray(M.hand.match.sides) ? M.hand.match : null;
  const CONNECT = 75 * 1000;
  let armed = 0, codeSent = '', codeBusy = false, codeNext = 0, joined = false, checked = false;
  const themName = () => (Q ? Q.sides[1 - Q.side].name : 'your opponent');

  /* The host puts the guest's pilot in the air as the server has it, whatever
     the guest's hello says: its start carries both pilots, and the guest's
     machine flies what the start says. */
  if (Q) {
    const heard = M.peerHello;
    M.peerHello = d => {
      heard(d);
      if (M.hand.role !== 'host') return;
      const s = Q.sides[1], i = CHARS.findIndex(c => c.id === s.pilot);
      if (i >= 0) MP.peerChar = i;
      MP.peerAwake = !!s.awake;
    };
  }
  /* The run has begun: both pilots as the server has them? A host that put
     anything else in the air broke the match's rules; this side says so to
     the referee, and the match is no contest (pvp/src/referee.js). */
  function check() {
    if (checked || !Q) return;
    checked = true;
    for (let k = 0; k < 2; k++) {
      const p = pilotP(k), s = Q.sides[k];
      if (!p || p.charId !== s.pilot || !!p.awake !== !!s.awake) { M.ref.broke = true; return; }
    }
  }

  const CSS = `
#pvp-room{position:fixed;inset:0;z-index:10;display:flex;align-items:center;justify-content:center;
  padding:16px;background:rgba(5,6,10,.86);font-family:Barlow,'Segoe UI',system-ui,sans-serif;color:#cbd5e1;cursor:auto}
#pvp-room[hidden]{display:none}
#pvp-room .card{width:100%;max-width:400px;padding:22px;border-radius:12px;text-align:center;
  background:rgba(8,13,22,.95);border:1px solid rgba(244,114,182,.4);box-shadow:0 0 40px rgba(244,114,182,.08)}
#pvp-room h2{font:700 12px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.2em;color:#f472b6}
#pvp-room .code{margin:16px 0 6px;font:800 44px 'JetBrains Mono',ui-monospace,monospace;letter-spacing:.24em;
  color:#e2e8f0;user-select:all;-webkit-user-select:all}
#pvp-room .line{margin-top:10px;font-size:14px;color:#94a3b8}
#pvp-room .note{min-height:16px;margin-top:8px;font:600 11px 'JetBrains Mono',ui-monospace,monospace;color:#64748b}
#pvp-room .note.bad{color:#f87171}
#pvp-room button{margin-top:16px;padding:10px 18px;border-radius:7px;cursor:pointer;background:rgba(103,232,249,.12);
  border:1px solid rgba(103,232,249,.6);color:#67e8f9;font:700 11px 'Chakra Petch',Barlow,sans-serif;letter-spacing:.14em}
#pvp-room button:hover{background:rgba(103,232,249,.22)}
#pvp-room.result{align-items:flex-end;background:transparent;pointer-events:none}
#pvp-room.result .card{width:auto;max-width:none;padding:0 0 5vh;background:none;border:0;box-shadow:none;pointer-events:auto}
#pvp-room.result h2,#pvp-room.result .code,#pvp-room.result .line,#pvp-room.result .note{position:absolute;width:1px;height:1px;
  overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
#pvp-room.result button{margin:0;background:rgba(8,13,22,.82)}`;

  function room() {
    if (box) return box;
    const st = document.createElement('style');
    st.textContent = CSS;
    document.head.appendChild(st);
    box = document.createElement('div');
    box.id = 'pvp-room';
    box.innerHTML = '<div class="card"><h2></h2><div class="code"></div><p class="line"></p>' +
                    '<p class="note"></p><button type="button">BACK TO THE LOBBY</button></div>';
    // keys typed here are the room's, never the game's
    for (const t of ['keydown', 'keyup']) box.addEventListener(t, e => e.stopPropagation());
    box.querySelector('button').addEventListener('click', back);
    document.body.appendChild(box);
    return box;
  }

  function say(title, code, line, note, bad) {
    const b = room();
    b.hidden = false;
    b.querySelector('h2').textContent = title;
    const c = b.querySelector('.code');
    c.textContent = code || '';
    c.hidden = !code;
    b.querySelector('.line').textContent = line || '';
    const n = b.querySelector('.note');
    n.textContent = note || '';
    n.classList.toggle('bad', !!bad);
  }

  /* Leaving, from the room's button or a finished match: the link goes first.
     `quit`: this player walked out mid-match, which the referee counts. */
  function back(quit) {
    M.ref.stop(quit === true);
    try { if (MP.on || MP.ready) mpQuit(); else { netHangUp(true); Net.phase = 'off'; } } catch (e) {}
    M.leave();
  }

  /* ------------------------------- the result -------------------------------
     What art.js's PVP_ART.result is handed (rounds.js draws it every frame,
     under the room's button): taken the moment the match ends and kept up to
     date as the referee answers (the verdict, and in ranked the rating).
     When the other side went, the engine has already let the second pilot
     go (mpPeerGone), so this side is the referee's (or the link's role), and
     the pilots are the server's match or the handshake's, not the air's.
     With the hook drawn, the room steps aside to its button; its words
     stay, for a screen reader. */
  M.shown = null;
  const CHAR = id => CHARS.find(c => c.id === id) || null;
  const mySide = () => (M.ref.side >= 0 ? M.ref.side : MP.role === 'guest' ? 1 : 0);
  // pilot k as this side sees it: its player's name, which pilot, its colour, awake or not
  function pilotOf(k, me) {
    const p = PILOTS.length > 1 ? pilotP(k) : null, mine = k === me;
    const id = p ? p.charId : Q ? Q.sides[k].pilot : ((mine ? CHARS[selectedChar] : CHARS[MP.peerChar]) || CHARS[0]).id;
    const c = CHAR(id);
    const name = mine ? Save.profile.name || 'YOU' : MP.peerName || (Q ? Q.sides[k].name : 'RIVAL');
    const awake = p ? !!p.awake : Q ? !!Q.sides[k].awake : mine ? isAwake(id) : !!MP.peerAwake;
    return { name: String(name).toUpperCase(), pilot: id, pilotName: c ? c.n : '', col: c ? c.col : '#67e8f9', awake };
  }
  /* Who is fighting, from this side, and what kind of match: what the belt
     (rounds.js) and the result are both handed beside their own data. */
  M.versus = () => {
    const m = (typeof RUN !== 'undefined' && RUN.pvp) || null;
    const me = mySide(), them = 1 - me;
    return {
      me: pilotOf(me, me), them: pilotOf(them, me),
      bestOf: m ? m.bestOf : M.bestOf(),
      queue: Q ? Q.queue : 'friend',
      league: Q && Q.queue === 'ranked' && Q.league ? { id: Q.league.id, n: Q.league.n } : null,
      rated: !!(Q && Q.rated),
      hull: id => hullPath(id)
    };
  };
  function scene(outcome) {
    const m = (typeof RUN !== 'undefined' && RUN.pvp) || null;
    const me = mySide(), them = 1 - me;
    const b = m ? M.maps.belt(m) : null;
    return Object.assign(M.versus(), {
      outcome,                                   // 'won' | 'lost' | 'left' (the other side went) | 'void'
      score: m ? [m.score[me], m.score[them]] : [0, 0],
      time: m ? m.clock : 0,
      rounds: m && m.log ? m.log.map(r => ({ won: r.w === me, at: r.at, left: r.left })) : [],
      dealt: m && m.dealt ? [Math.round(m.dealt[me]), Math.round(m.dealt[them])] : [0, 0],
      map: b ? b.maps[b.pick] : null,
      infested: !!(m && m.infested),
      verdict: null,
      rating: null
    });
  }
  function show(outcome) {
    M.shown = { at: Date.now(), r: scene(outcome) };
    if (window.PVP_ART && typeof PVP_ART.result === 'function') room().classList.add('result');
  }

  // the match is over for this machine: say why, and stay put until they go back
  function end(why) {
    over = why;
    show('left');
    try { if (LS.on) lsLeave(); pilotsEnd(); } catch (e) {}
    state = 'pvp';
    say('MATCH OVER', '', why, '', false);
    told(M.ref.verdict);
  }

  /* What the referee made of it (referee.js), under whichever screen is up:
     the result, or the other side leaving. Whose win it was is by the
     referee's side, which stays put when the second pilot has gone. */
  function told(v) {
    if (!v) return;
    const me = mySide();
    if (M.shown) {
      const r = M.shown.r;
      r.verdict = { v: v.v, won: v.winner === null || v.winner === undefined ? null : v.winner === me };
      r.rating = v.rating || null;
      if (v.v === 'void') r.outcome = 'void';
    }
    if (!box) return;
    const m = typeof RUN !== 'undefined' && RUN.pvp;
    const line = v.v === 'played' ? (m ? 'best of ' + m.bestOf + '  ·  ' : '') + 'recorded'
      : v.v === 'forfeit' ? (v.winner === me ? 'a win by forfeit' : 'a loss by forfeit') + '  ·  recorded'
      : v.v === 'void' ? 'no contest: the two games disagreed'
      : '';
    if (line) box.querySelector('.note').textContent = line;
  }
  M.ref.onVerdict = told;

  // a queued match that never got under way: nothing to record, back to the queue
  function noShow() {
    over = 'gone';
    M.ref.stop();
    try { netHangUp(true); Net.phase = 'off'; } catch (e) {}
    say('NO MATCH', '', themName() + ' didn\'t connect.', 'Nothing was recorded. Queue again from the lobby.', true);
  }

  /* A queued match's waiting room: the host's room code to the match, the
     guest's ask for it, and what each sees meanwhile. False: stop here. */
  function queued(host) {
    if (Date.now() - armed > CONNECT) { noShow(); return false; }
    const rule = (Q.league ? Q.league.n : 'CASUAL') + '  ·  best of ' + Q.bestOf;
    if (Net.phase === 'failed') { say('MATCH FOUND', '', 'Couldn\'t connect.', Net.note, true); return false; }
    if (host) {
      if (Net.code && Net.code !== codeSent && !codeBusy) {
        const code = Net.code;
        codeBusy = true;
        M.ref.code(code).then(d => { codeBusy = false; if (d) codeSent = code; });
      }
      say('MATCH FOUND', '', !Net.code ? 'Opening a room…' : MP.ready ? 'Connected. Starting the match…' : 'Waiting for ' + themName() + '…', rule);
    } else {
      if (!joined && !codeBusy && Date.now() >= codeNext) {
        codeBusy = true;
        codeNext = Date.now() + 1500;
        M.ref.code().then(d => {
          codeBusy = false;
          if (d && d.code && !joined && !over) { joined = true; netJoin(d.code); }
        });
      }
      say('MATCH FOUND', '', !joined ? 'Waiting for ' + themName() + '\'s room…'
        : MP.ready ? 'Connected. ' + themName() + ' is starting the match…' : 'Connecting to ' + themName() + '…', rule);
    }
    return true;
  }

  // what the waiting room says, from where the link has got to
  function waiting() {
    if (over) return;
    const host = M.hand.role === 'host';
    if (Q) { if (!queued(host)) return; }
    else if (Net.phase === 'failed') {
      say(host ? 'HOSTING' : 'JOINING', host ? Net.code : M.hand.code,
          'Couldn\'t connect.', Net.note, true);
      return;
    }
    else if (host) {
      if (!Net.code) say('HOSTING', '', 'Opening a room…', Net.note);
      else if (Net.phase === 'waiting') say('YOUR CODE', Net.code, 'Send it to your opponent. They type it under JOIN.', 'waiting for them…');
      else say('YOUR CODE', Net.code, 'Your opponent is joining…', Net.note || 'connecting');
    } else {
      say('JOINING', M.hand.code, MP.ready ? 'Connected. The host is starting the match…' : 'Connecting to the host…',
          Net.note || (Net.phase === 'live' ? 'linked' : ''));
    }
    // both have said hello: the host starts the run, and the header takes the guest into it
    if (host && !started && MP.ready && netLive()) {
      started = true;
      mpStartRun();
    }
  }

  // the result, once the match is decided (rounds.js: phase 'over')
  function result(m) {
    const me = pilotMine(), them = 1 - me, won = m.winner === me;
    over = won ? 'won' : 'lost';
    show(over);
    say(won ? 'VICTORY' : 'DEFEAT', '', M.nameOf(me) + '  ' + m.score[me] + ' — ' + m.score[them] + '  ' + M.nameOf(them),
        'best of ' + m.bestOf, false);
    M.ref.finish(m);
    told(M.ref.verdict);
  }

  M.modes.match = {
    loadout: 'casual',
    start() {
      state = 'pvp';
      armed = Date.now();
      if (Q) {
        M.ref.take(Q);                   // the queue made the referee's match, with this machine in it
        if (M.hand.role === 'host') netHost();
      }
      // a friend's: the host opens the referee's match first, so its id rides in the hello (referee.js)
      else if (M.hand.role === 'host') { const go = () => netHost(); M.ref.open(M.hand.pilot).then(go, go); }
      else netJoin(M.hand.code);
      waiting();
    },
    // the match's step (rounds.js)
    waves(dt) { M.rounds.tick(dt); },
    frame() {
      M.ref.tick();                      // the referee hears from a playing machine, not a hidden one
      const live = LS.on && MP.on;
      if (!live && !started && state === 'pvp') { waiting(); return; }
      if (live && !over) {
        started = true;
        check();
        if (box && !box.hidden) box.hidden = true;
        const m = RUN.pvp;
        if (m && m.run === LS.run && m.phase === 'over') { result(m); return; }
      }
      /* Decided, and on screen: whatever the link does now, this page stays
         on its result until the player leaves by its button. The other side
         going after the end takes the engine to its own co-op screens (the
         guest's 'lan' lost screen, mpPeerGone), under the result's button. */
      if (over) { if (state !== 'pvp') state = 'pvp'; return; }
      // this player quit, from the game's own pause screen: back to the lobby, a forfeit
      if (state === 'menu') { back(true); return; }
      /* The other side went. In co-op the host plays on alone and the guest
         is shown its lost screen ('lan'); a match is simply over. A host
         that was down between rounds as they went is 'dead' by now
         (mpPeerGone): theirs is the leaving, not this player's. */
      if (started && !MP.on) { end(M.hand.role === 'host' || Q ? 'Your opponent left.' : 'The host left.'); return; }
      if (state === 'dead') back();
    }
  };
})();
