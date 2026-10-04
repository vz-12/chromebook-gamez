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

  function render(d) {
    $('name').textContent = d.account.display;
    const lg = d.league;
    $('league').textContent = lg.n;
    if (lg.provisional) {
      const sm = document.createElement('small');
      sm.textContent = 'TO BE PLACED';
      $('league').append(sm);
    }
    $('leagueNote').textContent = lg.provisional
      ? 'Ratings start when matchmaking opens. Until your placement matches, ranked puts you in ' +
        lg.n + ': base pilots only, not awake. Your reward upgrades count in every league.'
      : '';
    $('rankedHead').textContent = 'RANKED · ' + lg.n;
    const { ranked, casual } = d.loadouts;
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
        b.addEventListener('click', () => practice(id, d));
        act.append(b);
      }
      tr.append(act);
      body.append(tr);
    }
    const ups = ranked.ups.length;
    $('ups').textContent = d.unlocks === null
      ? 'Your account has no save yet. Fly a run in VOIDRUNNER while signed in, and your unlocks arrive here.'
      : ups ? ups + ' reward upgrade' + (ups === 1 ? '' : 's') + ' come with you, in every league.'
            : 'No reward upgrades yet: clear challenges in VOIDRUNNER to earn them.';
  }

  /* PRACTICE: the play page (/play/, the game's engine in PvP mode) is
     handed what it needs for this tab: the mode, the pilot and the account
     as read here. pvp/site/js/mode.js takes it from there. */
  function practice(pilot, me) {
    try { sessionStorage.setItem('vr_pvp_play', JSON.stringify({ mode: 'practice', pilot, me })); }
    catch (e) { return; }
    location.href = '/play/';
  }

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
