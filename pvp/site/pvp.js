/* ===========================================================================
   VOIDRUNNER PvP — the page (PVP-PLAN.md, Phase 2)

   For now: who you are, your league, what it lets you bring, and the doors
   to and from the game. A player comes in from the game's PVP button with a
   hand-off code after the '#' (src/account.js, hand-offs) and the address
   they came from, which is where BACK TO VOIDRUNNER goes: the school address
   for a player on a school network, the usual one otherwise.
   ========================================================================= */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);

  /* The game's addresses. voidrunner.play101.workers.dev is the one school
     filters let through when they block .online. */
  const GAME = ['https://voidrunner.online', 'https://voidrunner.play101.workers.dev'];
  const local = h => h === 'localhost' || h === '127.0.0.1';
  const gameOk = o => {
    try {
      const u = new URL(o);
      return u.origin === o && (GAME.includes(o) || (local(u.hostname) && local(location.hostname)));
    } catch (e) { return false; }
  };
  const FROM = 'vr_pvp_from';
  const store = {
    get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} }
  };

  // what came after the '#', gone from the address bar before anything else
  const hash = new URLSearchParams(location.hash.slice(1));
  const code = hash.get('h'), from = hash.get('from');
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  if (from && gameOk(from)) store.set(FROM, from);
  const game = () => {
    const f = store.get(FROM);
    return f && gameOk(f) ? f : local(location.hostname) ? 'http://localhost:8787' : GAME[0];
  };

  async function call(method, path, body) {
    const opt = { method, cache: 'no-store', credentials: 'same-origin', headers: {} };
    if (body !== undefined) {
      opt.headers['content-type'] = 'application/json';
      opt.body = JSON.stringify(body);
    }
    try {
      const r = await fetch(path, opt);
      return { ok: r.ok, status: r.status, d: await r.json().catch(() => null) };
    } catch (e) { return { ok: false, status: 0, d: null }; }
  }

  const show = id => { for (const s of ['loading', 'signin', 'me']) $(s).hidden = s !== id; };

  function cell(text, cls) {
    const td = document.createElement('td');
    td.textContent = text;
    if (cls) td.className = cls;
    return td;
  }

  // a pilot picker, from a loadout: its pilots, said with AWAKE where they fly it; the choice kept across renders
  function pilotList(sel, lo, names) {
    const was = sel.value;
    sel.textContent = '';
    for (const id of lo.pilots) {
      const o = document.createElement('option');
      o.value = id;
      o.textContent = names[id] + (lo.awake.includes(id) ? ' · AWAKE' : '');
      sel.append(o);
    }
    if (lo.pilots.includes(was)) sel.value = was;
  }

  function render(d) {
    $('name').textContent = d.account.display;
    const lg = d.league;
    $('league').textContent = lg.n;
    const sm = document.createElement('small');
    sm.textContent = lg.provisional ? 'TO BE PLACED' : lg.rating + ' · ' + lg.wins + 'W ' + lg.losses + 'L';
    $('league').append(sm);
    const flies = lg.pilots === 'base' || lg.provisional ? 'base pilots only, not awake' : 'every pilot you own, awake where it is';
    $('leagueNote').textContent = lg.provisional
      ? 'Play ' + lg.left + ' more ranked match' + (lg.left === 1 ? '' : 'es') + ' to be placed in a league. Until then ranked puts you in ' +
        lg.n + ': ' + flies + '. Your reward upgrades count in every league.'
      : lg.n + ' flies ' + flies + ', best of ' + lg.bestOf + '. Your reward upgrades count in every league.';
    $('rankedHead').textContent = 'RANKED · ' + lg.n;
    $('rankedHead2').textContent = 'RANKED · ' + lg.n;
    $('rankedRule').textContent = 'Rated, in leagues. ' + (lg.provisional ? lg.left + ' placement match' + (lg.left === 1 ? '' : 'es') + ' to go. ' : '') +
      'Best of ' + lg.bestOf + ', ' + flies + '.';
    const { ranked, casual } = d.loadouts;
    pilotList($('rankedPilot'), ranked, d.pilots);
    pilotList($('casualPilot'), casual, d.pilots);
    const body = $('pilots');
    body.textContent = '';
    for (const [id, n] of Object.entries(d.pilots)) {
      const tr = document.createElement('tr');
      const can = l => (l.pilots.includes(id) ? (l.awake.includes(id) ? ['YES · AWAKE', 'awake'] : ['YES', 'yes']) : ['—', 'no']);
      const own = casual.pilots.includes(id);
      tr.append(cell(n), cell(own ? 'YES' : '—', own ? 'yes' : 'no'), cell(...can(ranked)), cell(...can(casual)));
      const act = document.createElement('td');
      if (own) {
        const b = document.createElement('button');
        b.type = 'button'; b.className = 'link practice'; b.textContent = 'PRACTICE';
        b.addEventListener('click', () => practice(id));
        act.append(b);
      }
      tr.append(act);
      body.append(tr);
    }
    // a friend's match: any pilot owned
    me = d;
    pilotList($('matchPilot'), casual, d.pilots);
    const ups = ranked.ups.length;
    $('ups').textContent = d.unlocks === null
      ? 'Your account has no save yet. Fly a run in VOIDRUNNER while signed in, and your unlocks arrive here.'
      : ups ? ups + ' reward upgrade' + (ups === 1 ? '' : 's') + ' come with you, in every league.'
            : 'No reward upgrades yet: clear challenges in VOIDRUNNER to earn them.';
  }

  /* The play page (/play/, the game's engine in PvP mode) is handed what it
     needs for this tab: the mode, the pilot, a match's side and code, and
     the account as read here. pvp/site/js/mode.js takes it from there. */
  let me = null;
  function play(hand) {
    try { sessionStorage.setItem('vr_pvp_play', JSON.stringify(Object.assign({ me }, hand))); }
    catch (e) { $('matchMsg').textContent = "THIS BROWSER WON'T KEEP THE MATCH: TRY ANOTHER"; return; }
    location.href = '/play/';
  }
  const practice = pilot => play({ mode: 'practice', pilot });

  $('host').addEventListener('click', () => play({ mode: 'match', role: 'host', pilot: $('matchPilot').value }));
  $('joinForm').addEventListener('submit', e => {
    e.preventDefault();
    const code = $('code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) { $('matchMsg').textContent = 'A CODE IS FOUR LETTERS AND NUMBERS'; return; }
    play({ mode: 'match', role: 'guest', code, pilot: $('matchPilot').value });
  });

  /* The queues (/api/pvp/queue): join with a pilot, then poll every two
     seconds until the server pairs this player with someone. The match it
     hands back (its id, this player's side and role, the rules it flies and
     both sides) goes to the play page, which connects the two by the room
     code the match passes along. A ticket nobody polls is dropped, so a
     closed tab leaves the queue by itself; leaving says so at once. */
  const Q = { queue: null, t0: 0, poll: 0, clock: 0 };
  const queueCall = (op, extra) => call('POST', '/api/pvp/queue', Object.assign({ op, queue: Q.queue }, extra));
  const mmss = ms => { const s = Math.floor(ms / 1000); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  function searching(on, what) {
    $('queues').hidden = on;
    $('searching').hidden = !on;
    $('searching').classList.remove('found');
    clearInterval(Q.clock);
    if (!on) return;
    $('searchWhat').textContent = what;
    $('searchClock').textContent = '0:00';
    $('searchNote').textContent = 'Looking for an opponent near your rating. The search widens the longer you wait.';
    $('cancel').hidden = false;
    Q.clock = setInterval(() => { $('searchClock').textContent = mmss(Date.now() - Q.t0); }, 500);
  }
  function stopQueue(msg) {
    Q.queue = null;
    clearTimeout(Q.poll);
    searching(false);
    $('queueMsg').textContent = msg || '';
  }
  function heard(r) {
    if (!Q.queue) return;
    if (r.status === 401) { stopQueue(); show('signin'); return; }
    if (!r.ok || !r.d) { Q.poll = setTimeout(pollQueue, 3000); return; }       // a blip: try again
    if (r.d.state === 'matched') { found(r.d.match); return; }
    if (r.d.state !== 'waiting') { stopQueue('YOUR PLACE IN THE QUEUE WAS LOST: TRY AGAIN'); return; }
    Q.poll = setTimeout(pollQueue, 2000);
  }
  async function pollQueue() { if (Q.queue) heard(await queueCall('poll')); }

  async function joinQueue(queue) {
    if (Q.queue) return;
    const pilot = $(queue + 'Pilot').value;
    $('queueMsg').textContent = '';
    Q.queue = queue; Q.t0 = Date.now();
    searching(true, 'SEARCHING ' + (queue === 'ranked' ? 'RANKED' : 'CASUAL'));
    const r = await queueCall('join', { pilot });
    if (r.ok || r.status === 401) { heard(r); return; }
    stopQueue(r.status === 400 && r.d && r.d.error ? String(r.d.error).toUpperCase()
      : r.status ? 'SOMETHING WENT WRONG (' + r.status + ')' : 'CAN\'T REACH THE SERVER');
  }

  // paired: who against, a moment to read it, then the match
  function found(match) {
    const queue = Q.queue;
    Q.queue = null;
    clearTimeout(Q.poll); clearInterval(Q.clock);
    const them = match.sides[1 - match.side];
    $('searching').classList.add('found');
    $('searchWhat').textContent = 'MATCH FOUND';
    $('searchClock').textContent = '';
    $('searchNote').textContent = 'Against ' + them.name + ', flying ' + ((me && me.pilots[them.pilot]) || them.pilot) +
      (them.awake ? ' (awake)' : '') + '. ' + match.league.n + ', best of ' + match.bestOf + '.';
    $('cancel').hidden = true;
    setTimeout(() => play({ mode: 'match', role: match.role, queue, pilot: match.sides[match.side].pilot, match }), 1200);
  }

  $('playRanked').addEventListener('click', () => joinQueue('ranked'));
  $('playCasual').addEventListener('click', () => joinQueue('casual'));
  $('cancel').addEventListener('click', async () => {
    if (!Q.queue) return;
    const r = await queueCall('leave');
    if (r.ok && r.d && r.d.state === 'matched') { found(r.d.match); return; }    // too late: already paired
    stopQueue();
  });
  addEventListener('pagehide', () => {
    if (!Q.queue) return;
    try {
      fetch('/api/pvp/queue', { method: 'POST', keepalive: true, credentials: 'same-origin',
        headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op: 'leave', queue: Q.queue }) });
    } catch (e) {}
  });

  async function load() {
    const r = await call('GET', '/api/pvp/me');
    if (r.status === 401) { show('signin'); return; }
    if (!r.ok || !r.d) {
      $('loading').querySelector('p').textContent = 'CAN\'T REACH THE SERVER. TRY AGAIN IN A MOMENT.';
      show('loading');
      return;
    }
    render(r.d);
    show('me');
  }

  $('form').addEventListener('submit', async e => {
    e.preventDefault();
    const f = e.target, btn = f.querySelector('button');
    const name = f.elements.username.value.trim(), pass = f.elements.password.value;
    if (!name || !pass) { $('msg').textContent = 'FILL IN BOTH BOXES'; return; }
    btn.disabled = true; $('msg').textContent = '…';
    const r = await call('POST', '/api/account', { op: 'login', name, pass });
    btn.disabled = false;
    if (r.ok) { $('msg').textContent = ''; f.reset(); await load(); return; }
    $('msg').textContent = r.status === 401 ? 'WRONG NAME OR PASSWORD'
      : r.status === 429 ? 'TOO MANY TRIES. WAIT ' + Math.ceil(((r.d && r.d.retryIn) || 60) / 60) + ' MIN'
      : r.status ? 'SOMETHING WENT WRONG (' + r.status + ')' : 'CAN\'T REACH THE SERVER';
  });

  $('out').addEventListener('click', async () => {
    if (Q.queue) { await queueCall('leave'); stopQueue(); }
    await call('POST', '/api/account', { op: 'logout' });
    show('signin');
  });

  /* Back to the game, signed in there too: a hand-off the other way. Signed
     out here, it is only a link. */
  $('back').addEventListener('click', async () => {
    const to = game();
    const r = await call('POST', '/api/account', { op: 'handoff', to });
    location.href = to + '/' + (r.ok && r.d && r.d.code ? '#h=' + r.d.code : '');
  });
  $('privacy').href = game() + '/privacy';

  (async () => {
    if (code) await call('POST', '/api/account', { op: 'handoff-take', code });
    await load();
  })();
})();
