/* ===========================================================================
   VOIDRUNNER PvP — a match with a friend (PVP-PLAN.md, Phase 3 step 2)

   Two players, two machines, one run, on the game's own co-op stack as it
   is. The host opens a room and is given a code; the guest typed it in the
   lobby. The engine's netHost / netJoin connect them through PvP's Worker
   (/api/room for the handshake, /api/turn for the relay, so it works on any
   network), both say hello, and the host starts the run: LOCKSTEP CO-OP,
   each machine flying its own pilot (TWO PILOTS), in an empty arena.

   This step is the connection only. How a fight plays (pilots hurting each
   other, rounds, what spawns) is step 3's, and is decided before it is built.

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
#pvp-room button:hover{background:rgba(103,232,249,.22)}`;

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

  // leaving, from the room's button or a finished match: the link goes first
  function back() {
    try { if (MP.on || MP.ready) mpQuit(); else { netHangUp(true); Net.phase = 'off'; } } catch (e) {}
    M.leave();
  }

  // the match is over for this machine: say why, and stay put until they go back
  function end(why) {
    over = why;
    try { if (LS.on) lsLeave(); pilotsEnd(); } catch (e) {}
    state = 'pvp';
    say('MATCH OVER', '', why, '', false);
  }

  // what the waiting room says, from where the link has got to
  function waiting() {
    if (over) return;
    const host = M.hand.role === 'host';
    if (Net.phase === 'failed') {
      say(host ? 'HOSTING' : 'JOINING', host ? Net.code : M.hand.code,
          'Couldn\'t connect.', Net.note, true);
      return;
    }
    if (host) {
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

  M.modes.match = {
    loadout: 'casual',
    start() {
      state = 'pvp';
      if (M.hand.role === 'host') netHost();
      else netJoin(M.hand.code);
      waiting();
    },
    // nothing spawns (step 3 decides what a fight is)
    waves() {},
    frame() {
      if (state === 'pvp') { waiting(); return; }
      if (state === 'play' && !over) {
        started = true;
        if (box && !box.hidden) box.hidden = true;
      }
      if (over) return;
      // this player quit, from the game's own pause screen: back to the lobby
      if (state === 'menu' || state === 'dead') { back(); return; }
      /* The other side went. In co-op the host plays on alone and the guest
         is shown its lost screen ('lan'); a match is simply over. */
      if (started && !MP.on) end(M.hand.role === 'host' ? 'Your opponent left.' : 'The host left.');
    }
  };
})();
