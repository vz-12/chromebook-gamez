/* ===========================================================================
   VOIDRUNNER — the leaderboard page.

   Everything comes from /api/boards (src/boards.js), which keeps every
   player's row on every board, not only the top 100 the game shows. Three
   things on one page:

     YOUR PLACEMENT   where this browser stands. Signed in, that is the
                      account; otherwise the save this browser plays under
                      (the same address, so its profile is right here).
     SEARCH           any callsign or account name, by how it starts, with a
                      placement on every board. A placement jumps to its page.
     THE BOARDS       season (and past ones), all-time, the daily (and past
                      days), and the PvP ladder (and past seasons'). 50 to a page.
     PROFILES         any account's own page (#u/<account name>): where it
                      stands, its pilots, its podiums, its PvP record. Every
                      account's name on the page is a link to it.

   Every picture on the page is a hook in art.js (window.LB_ART), which
   lists them. This file only places the canvases and calls the hooks.

   The address keeps the board you are on (#season/2026-10/50) or the
   profile (#u/notz), so a link to a page is a link to that page. Text from
   the server only ever goes in as text.
   ========================================================================= */
(() => {
  'use strict';
  const API = '/api/boards';
  const PAGE = 50;
  const SAVE_KEY = 'voidrunner_save_v1';
  const MON = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  };
  const fmt = n => (n === null || n === undefined ? '—' : Number(n).toLocaleString('en-US'));
  const clock = s => (s === null || s === undefined ? '—'
    : Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0'));
  const seasonLabel = id => MON[+id.slice(5, 7) - 1] + ' ' + id.slice(0, 4);
  const dayLabel = d => +d.slice(8, 10) + ' ' + MON[+d.slice(5, 7) - 1] + ' ' + d.slice(0, 4);
  const dateOf = t => (t ? dayLabel(new Date(t).toISOString().slice(0, 10)) : '—');

  /* -------------------------------- the art --------------------------------
     Sizes each hook's canvas for the screen, keeps the clock, calls the hook
     every frame while its canvas is on the page, and keeps a hook that
     throws from taking anything else with it. A hook art.js does not define
     gets no canvas at all. */
  const ART = window.LB_ART || {};
  const STILL = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T0 = performance.now();
  const clockNow = () => (STILL ? 0 : (performance.now() - T0) / 1000);
  const painted = new Set(), broken = new Set();
  // ?hooks in the address: every canvas outlined, with its hook's name and size, for drawing them
  const HOOKS = /[?&]hooks\b/.test(location.search);

  function paint(p, t) {
    const r = p.cv.getBoundingClientRect();
    const w = Math.round(r.width), h = Math.round(r.height);
    if (!w || !h) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const bw = Math.round(w * dpr), bh = Math.round(h * dpr);
    if (p.cv.width !== bw || p.cv.height !== bh) { p.cv.width = bw; p.cv.height = bh; }
    const g = p.g || (p.g = p.cv.getContext('2d'));
    /* The whole bitmap, before the scale: on a 125% screen a canvas 38 px
       tall is 47.5 of its 48 rows in CSS pixels, and the row a clear in CSS
       pixels misses keeps every frame's drawing, building to a bright line. */
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, bw, bh);
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.save();
    try { ART[p.hook](g, w, h, t, ...p.data); }
    catch (e) {
      if (!broken.has(p.hook)) { broken.add(p.hook); console.error('leaderboard art: LB_ART.' + p.hook + ' threw', e); }
    }
    g.restore();
    if (HOOKS) {
      g.save();
      g.strokeStyle = 'rgba(244, 114, 182, .9)'; g.lineWidth = 1; g.setLineDash([4, 3]);
      g.strokeRect(0.5, 0.5, w - 1, h - 1);
      g.setLineDash([]);
      g.font = "600 10px 'JetBrains Mono', monospace"; g.textBaseline = 'top';
      const label = p.hook + ' ' + w + '×' + h, tw = g.measureText(label).width;
      g.fillStyle = 'rgba(5, 6, 10, .82)'; g.fillRect(1, 1, tw + 8, 14);
      g.fillStyle = '#f472b6'; g.fillText(label, 5, 3);
      g.restore();
    }
  }
  // a canvas drawn by one of the hooks, or null when there is no such hook
  function art(hook, cls, ...data) {
    if (typeof ART[hook] !== 'function') return null;
    const cv = document.createElement('canvas');
    cv.className = 'art ' + cls;
    cv.setAttribute('aria-hidden', 'true');
    const p = { cv, hook, data, seen: false };
    cv.art = p;
    painted.add(p);
    return cv;
  }
  function frame() {
    const t = clockNow();
    for (const p of painted) {
      if (!p.cv.isConnected) { if (p.seen) painted.delete(p); continue; }
      p.seen = true;
      paint(p, t);
    }
    if (!STILL) requestAnimationFrame(frame);
  }
  // still, each picture is drawn once, and again when the window changes size
  if (STILL) addEventListener('resize', () => requestAnimationFrame(frame));
  for (const [k, v] of Object.entries(ART.theme || {}))
    if (/^[\w-]+$/.test(k) && typeof v === 'string') document.documentElement.style.setProperty('--' + k, v);

  const LEAGUES = [['bronze', 'BRONZE'], ['silver', 'SILVER'], ['gold', 'GOLD'], ['platinum', 'PLATINUM'], ['void', 'VOID']];
  const LEAGUE_N = Object.fromEntries(LEAGUES);
  const QUEUE_N = { ranked: 'RANKED', casual: 'CASUAL', friend: 'FRIEND' };
  const TITLE = document.title;
  const isUser = v => typeof v === 'string' && /^[a-z0-9_-]{3,16}$/.test(v);

  /* What is showing: the tab ('u' for a profile, whose account name is
     `user`), which season or day, and how far down; `back` is the board a
     profile was opened from. */
  const S = { tab: 'season', id: '', from: 0, user: '', back: '#season', cal: null, seasons: [], mark: null, busy: 0 };

  function keyOf(tab, id) {
    if (tab === 'all') return 'all';
    if (tab === 'season') return 'season:' + (id || (S.cal && S.cal.season) || '');
    if (tab === 'day') return 'day:' + (id || (S.cal && S.cal.day) || '');
    if (tab === 'pvp') return 'pvp:' + (id || (S.cal && S.cal.season) || '');
    return tab;
  }
  function nameOf(key) {
    if (key === 'all') return 'ALL-TIME';
    if (key.startsWith('season:')) return 'SEASON · ' + seasonLabel(key.slice(7));
    if (key.startsWith('day:')) return 'DAILY · ' + dayLabel(key.slice(4));
    if (key.startsWith('pvp:')) return 'PVP · ' + seasonLabel(key.slice(4));
    return key.toUpperCase();
  }
  // a board key back to where it lives on the page
  function placeOf(key) {
    if (key === 'all') return { tab: 'all', id: '' };
    const [tab, id] = key.split(':');
    return { tab, id };
  }

  /* ------------------------------ the address ------------------------------ */
  function readHash() {
    const [tab, a, b] = location.hash.replace(/^#/, '').split('/');
    if (tab === 'u') {
      const user = String(a || '').toLowerCase();
      if (!isUser(user)) return;
      if (S.tab !== 'u') S.back = hashOf();
      S.tab = 'u'; S.user = user;
      return;
    }
    if (!['season', 'all', 'day', 'pvp'].includes(tab)) return;
    S.tab = tab;
    if (tab === 'all') { S.id = ''; S.from = Math.max(0, parseInt(a, 10) || 0); }
    else { S.id = /^\d{4}-\d{2}(-\d{2})?$/.test(a || '') ? a : ''; S.from = Math.max(0, parseInt(b, 10) || 0); }
  }
  function hashOf() {
    if (S.tab === 'u') return '#u/' + S.user;
    const parts = [S.tab];
    if (S.tab === 'season' || S.tab === 'day' || S.tab === 'pvp') parts.push(S.id || '');
    if (S.from) parts.push(String(S.from));
    return '#' + parts.join('/').replace(/\/+$/, '');
  }
  function writeHash() {
    const h = hashOf();
    if (location.hash !== h) history.replaceState(null, '', h);
  }

  async function api(qs, body) {
    const r = await fetch(API + (qs ? '?' + qs : ''), body === undefined ? { cache: 'no-store' } : {
      method: 'POST', cache: 'no-store', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body)
    });
    const d = await r.json().catch(() => null);
    if (!r.ok || !d) throw new Error((d && d.error) || 'http ' + r.status);
    return d;
  }

  function calendar(d) {
    if (!d || !d.season) return;
    S.cal = { season: d.season, day: d.day };
    $('cal').textContent = 'SEASON ' + seasonLabel(d.season) + '   ·   TODAY ' + dayLabel(d.day) + ' UTC';
  }

  /* ------------------------------- the board -------------------------------- */
  function tabs() {
    for (const b of document.querySelectorAll('#tabs button'))
      b.setAttribute('aria-selected', String(b.dataset.tab === S.tab));
  }

  // the season or day picker under the tabs
  function picker() {
    const sel = $('which');
    sel.textContent = '';
    if ((S.tab === 'season' || S.tab === 'pvp') && S.seasons.length) {
      for (const id of S.seasons) sel.append(new Option(seasonLabel(id) + (id === S.cal.season ? '  (NOW)' : ''), id));
      sel.value = S.id || S.cal.season;
      sel.hidden = false;
    } else if (S.tab === 'day' && S.cal) {
      const t = Date.parse(S.cal.day + 'T00:00:00Z');
      for (let i = 0; i < 30; i++) {
        const d = new Date(t - i * 86400000).toISOString().slice(0, 10);
        sel.append(new Option(dayLabel(d) + (i === 0 ? '  (TODAY)' : ''), d));
      }
      if (S.id && ![...sel.options].some(o => o.value === S.id)) sel.append(new Option(dayLabel(S.id), S.id));
      sel.value = S.id || S.cal.day;
      sel.hidden = false;
    } else sel.hidden = true;
  }

  // the board's message, with LB_ART.empty's scene over it (kind: loading | empty | error)
  function note(text, bad, kind) {
    $('rows').textContent = '';
    $('podium').hidden = true;
    const n = $('note');
    n.textContent = '';
    const cv = art('empty', 'empty-art', kind || (bad ? 'error' : 'empty'));
    if (cv) n.append(cv);
    n.append(el('span', null, text));
    n.className = 'note' + (bad ? ' bad' : '');
    n.hidden = false;
  }

  /* A player's name, and the ◆ chip of their account: links to the
     account's profile. A guest's callsign is only a name. */
  function nameEl(name, user, cls) {
    if (!user) return el('span', cls, name);
    const a = el('a', cls + ' to', name);
    a.href = '#u/' + user;
    a.title = 'Open ' + name + '\'s profile';
    return a;
  }
  function acctEl(account, user) {
    const a = nameEl('◆ ' + account, user, 'acct');
    if (!user) a.title = 'Signed-in account: ' + account;
    return a;
  }

  function row(r) {
    const tr = el('tr');
    if (r.rank <= 3) tr.className = 'p' + r.rank;
    if (S.mark && S.mark.name === r.name && S.mark.score === r.score) tr.classList.add('mark');
    const rk = el('td', 'r');
    const medal = r.rank <= 3 ? art('medal', 'medal', r.rank) : null;
    // the medal shows the number; the text stays for screen readers and copying
    if (medal) rk.append(medal, el('span', 'sr', String(r.rank)));
    else rk.textContent = String(r.rank);
    tr.append(rk);
    const who = el('td');
    who.append(nameEl(r.name, r.user, 'name'));
    if (r.account) who.append(acctEl(r.account, r.user));
    tr.append(who,
      el('td', 'n score', fmt(r.score)), el('td', 'n', fmt(r.wave)),
      el('td', 'opt', r.sector || '—'), el('td', 'n opt', fmt(r.level)),
      el('td', 'n opt', fmt(r.kills)), el('td', 'n opt', clock(r.time)), el('td', 'opt', dateOf(r.at)));
    return tr;
  }

  async function load() {
    tabs();
    writeHash();
    const prof = S.tab === 'u', pvp = S.tab === 'pvp';
    $('boards').hidden = prof;
    $('profile').hidden = !prof;
    if (prof) { profileLoad(); return; }
    document.title = TITLE;
    $('profile').textContent = '';
    $('podium').hidden = true;
    $('pvp').hidden = !pvp;
    $('tableWrap').hidden = pvp;
    $('pager').hidden = true;
    $('count').textContent = '';
    if (pvp) { loadLadder(); return; }
    picker();
    note('LOADING…', false, 'loading');
    const ticket = ++S.busy;
    let d;
    try {
      d = await api('board=' + S.tab + (S.id ? '&id=' + S.id : '') + '&from=' + S.from + '&n=' + PAGE);
    } catch (e) {
      if (ticket === S.busy) note('THE BOARDS CAN\'T BE REACHED RIGHT NOW. TRY AGAIN IN A MOMENT.', true);
      return;
    }
    if (ticket !== S.busy) return;            // another board was asked for meanwhile
    calendar(d);
    picker();                                 // the calendar may only just have arrived
    $('count').textContent = d.total ? fmt(d.total) + (d.total === 1 ? ' PILOT' : ' PILOTS') : '';
    if (!d.rows.length) {
      const today = S.tab === 'day' && (!S.id || (S.cal && S.id === S.cal.day));
      note(d.total ? 'NOBODY THIS FAR DOWN.'
        : S.tab !== 'day' ? 'NOBODY ON THIS BOARD YET.'
        : today ? 'NOBODY HAS FLOWN TODAY\'S DAILY YET.' : 'NOBODY FLEW THIS DAILY.');
      return;
    }
    $('note').hidden = true;
    const body = $('rows');
    body.textContent = '';
    // each row's place on the page, for the stagger as they come in (leaderboard.css)
    d.rows.forEach((r, i) => { const tr = row(r); tr.style.setProperty('--i', i); body.append(tr); });
    // the podium: the first page's top three
    if (PODIUM && S.from === 0) {
      PODIUM.art.data = [d.rows.slice(0, 3).map(r => ({ rank: r.rank, name: r.name, score: r.score,
                                                         wave: r.wave, account: r.account })), S.tab];
      $('podium').hidden = false;
    }
    pager(d);
    const hit = body.querySelector('tr.mark');
    if (hit) hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function pager(d) {
    $('pager').hidden = d.total <= PAGE;
    $('prev').disabled = S.from <= 0;
    $('next').disabled = S.from + d.rows.length >= d.total;
    $('pos').textContent = fmt(S.from + 1) + '–' + fmt(S.from + d.rows.length) + ' OF ' + fmt(d.total);
  }

  /* ------------------------------- the ladder ------------------------------- */
  // the ladder's message, with LB_ART.empty's scene over it
  function ladderNote(text, bad, kind) {
    $('ladderRows').textContent = '';
    const n = $('ladderNote');
    n.textContent = '';
    const cv = art('empty', 'empty-art', kind || (bad ? 'error' : 'empty'));
    if (cv) n.append(cv);
    n.append(el('span', null, text));
    n.className = 'note' + (bad ? ' bad' : '');
    n.hidden = false;
  }

  function ladderRow(r) {
    const tr = el('tr');
    if (r.rank <= 3) tr.className = 'p' + r.rank;
    if (S.mark && S.mark.user === r.user) tr.classList.add('mark');
    const rk = el('td', 'r');
    const medal = r.rank <= 3 ? art('medal', 'medal', r.rank) : null;
    if (medal) rk.append(medal, el('span', 'sr', String(r.rank)));
    else rk.textContent = String(r.rank);
    const who = el('td');
    who.append(nameEl(r.name, r.user, 'name'));
    const lg = el('td', 'lgc');
    const crest = art('league', 'lg-mini', r.league);
    if (crest) lg.append(crest);
    lg.append(el('span', 'lg-' + r.league, LEAGUE_N[r.league] || String(r.league).toUpperCase()));
    const games = r.wins + r.losses;
    tr.append(rk, who, lg, el('td', 'n score', fmt(r.rating)), el('td', 'n opt', fmt(r.wins)), el('td', 'n opt', fmt(r.losses)),
              el('td', 'n opt', games ? Math.round(r.wins / games * 100) + '%' : '—'));
    return tr;
  }

  async function loadLadder() {
    picker();
    ladderNote('LOADING…', false, 'loading');
    const ticket = ++S.busy;
    let d;
    try { d = await api('board=pvp' + (S.id ? '&id=' + S.id : '') + '&from=' + S.from + '&n=' + PAGE); }
    catch (e) {
      if (ticket === S.busy) ladderNote('THE LADDER CAN\'T BE REACHED RIGHT NOW. TRY AGAIN IN A MOMENT.', true);
      return;
    }
    if (ticket !== S.busy) return;
    calendar(d);
    picker();
    for (const [id] of LEAGUES) { const c = $('lgn-' + id); if (c) c.textContent = fmt((d.leagues && d.leagues[id]) || 0); }
    $('count').textContent = d.total ? fmt(d.total) + ' PLACED' : '';
    if (!d.rows.length) {
      ladderNote(d.total ? 'NOBODY THIS FAR DOWN.' : 'NOBODY HAS BEEN PLACED THIS SEASON YET. FIVE RANKED MATCHES PLACE A PILOT.', false, 'pvp');
      return;
    }
    $('ladderNote').hidden = true;
    const body = $('ladderRows');
    body.textContent = '';
    d.rows.forEach((r, i) => { const tr = ladderRow(r); tr.style.setProperty('--i', i); body.append(tr); });
    pager(d);
    const hit = body.querySelector('tr.mark');
    if (hit) hit.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }

  function go(tab, id, from, mark) {
    S.tab = tab; S.id = id || ''; S.from = from || 0; S.mark = mark || null;
    load();
  }

  // a placement, opened: its board, at its page, with the row lit
  function jump(key, p) {
    const at = placeOf(key);
    go(at.tab, at.id, Math.floor((p.rank - 1) / PAGE) * PAGE, { name: p.name, score: p.score });
    $('tabs').scrollIntoView({ behavior: 'smooth' });
  }

  /* -------------------------- players and placements ------------------------ */
  // the boards worth asking about: this season, all-time, today, and the one on screen
  function standingBoards() {
    const list = ['season:' + S.cal.season, 'all', 'day:' + S.cal.day];
    const now = keyOf(S.tab, S.id);
    if (S.tab !== 'pvp' && !list.includes(now)) list.push(now);
    return list;
  }

  function chips(p, boards) {
    const box = el('div', 'chips');
    for (const key of boards) {
      const b = p.boards[key];
      if (!b) { box.append(el('span', 'chip off', nameOf(key) + ' · —')); continue; }
      const c = el('button', 'chip');
      c.type = 'button';
      c.append(nameOf(key) + ' · ', el('b', null, '#' + fmt(b.rank)), ' of ' + fmt(b.of) + ' · ' + fmt(b.score));
      c.addEventListener('click', () => jump(key, b));
      box.append(c);
    }
    // an account: where it stands on this season's ladder, and its profile
    const v = p.pvp;
    if (v && v.league) {
      const c = el('button', 'chip');
      c.type = 'button';
      c.append('PVP · ' + (LEAGUE_N[v.league] || '') + ' · ', el('b', null, '#' + fmt(v.rank)), ' of ' + fmt(v.of) + ' · ' + fmt(v.rating));
      c.addEventListener('click', () => {
        go('pvp', '', Math.floor((v.rank - 1) / PAGE) * PAGE, { user: p.user });
        $('tabs').scrollIntoView({ behavior: 'smooth' });
      });
      box.append(c);
    } else if (v && v.placing) box.append(el('span', 'chip off', 'PVP · BEING PLACED'));
    if (p.user) {
      const a = el('a', 'chip prof', 'PROFILE →');
      a.href = '#u/' + p.user;
      box.append(a);
    }
    return box;
  }

  async function search(q) {
    if (!S.cal) return;
    const out = $('found');
    out.hidden = false;
    out.textContent = '';
    out.append(el('p', 'empty', 'SEARCHING…'));
    let d;
    try { d = await api('q=' + encodeURIComponent(q) + '&boards=' + encodeURIComponent(standingBoards().join(','))); }
    catch (e) { out.textContent = ''; out.append(el('p', 'empty', 'SEARCH IS UNAVAILABLE RIGHT NOW.')); return; }
    out.textContent = '';
    if (!d.players.length) {
      out.append(el('p', 'empty', 'NO PILOT\'S CALLSIGN OR ACCOUNT STARTS WITH “' + d.q.toUpperCase() + '”.'));
      return;
    }
    for (const p of d.players) {
      const card = el('div', 'player');
      const who = el('div', 'who');
      who.append(nameEl(p.name, p.user, 'pname'));
      if (p.account) who.append(acctEl(p.account, p.user));
      card.append(who, chips(p, d.boards));
      out.append(card);
    }
  }

  function myProfile() {
    try {
      const p = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
      return p && typeof p === 'object' ? p : null;
    } catch (e) { return null; }
  }

  async function mine() {
    const prof = myProfile();
    const pid = prof && /^[0-9a-f]{16,64}$/.test(prof.pid || '') ? prof.pid : null;
    let d;
    try { d = await api('', { op: 'me', pid, boards: standingBoards() }); }
    catch (e) { return; }
    if (!d.players.length && !d.signedIn && !(prof && prof.name)) return;   // never played here
    const box = $('mineCards');
    box.textContent = '';
    const me = d.players[0] || { boards: {} };
    for (const key of d.boards.slice(0, 3)) {
      const b = me.boards[key];
      const card = el(b ? 'button' : 'div', 'card' + (b ? '' : ' none'));
      const back = art('card', 'card-art', { board: placeOf(key).tab, rank: b ? b.rank : 0, of: b ? b.of : 0 });
      if (back) card.append(back);
      card.append(el('div', 'k', nameOf(key)));
      if (b) {
        card.type = 'button';
        const v = el('div', 'v', '#' + fmt(b.rank));
        v.append(el('small', null, ' of ' + fmt(b.of)));
        card.append(v, el('div', 's', fmt(b.score) + ' · ' + b.name + ' · W' + fmt(b.wave)));
        card.addEventListener('click', () => jump(key, b));
      } else {
        card.append(el('div', 'v', key.startsWith('day:') ? 'NOT FLOWN TODAY' : 'NOT PLACED'));
      }
      box.append(card);
    }
    // signed in: their own page
    if (d.signedIn && me.user) {
      const a = el('a', 'card prof');
      a.href = '#u/' + me.user;
      a.append(el('div', 'k', 'YOUR PROFILE'), el('div', 'v', '◆ ' + (me.account || me.name)), el('div', 's', 'placements, pilots, PvP →'));
      box.append(a);
    }
    $('mine').hidden = false;
  }

  /* ------------------------------- a profile --------------------------------
     One account's page, from /api/boards?user= (src/profiles.js): its
     header, its four placements, its hangar, its podiums, and its PvP record
     with the latest matches. Each picture is a hook of art.js's (THE
     PROFILE); the opponents' names lead to their own pages. */
  const ORD = n => n + (n % 100 >= 11 && n % 100 <= 13 ? 'TH' : ({ 1: 'ST', 2: 'ND', 3: 'RD' })[n % 10] || 'TH');

  function tile(kind, label, rank, of, big, small, open, league) {
    const t = el(open ? 'button' : 'div', 'ptile' + (rank ? '' : ' none'));
    if (open) { t.type = 'button'; t.addEventListener('click', open); }
    const bg = art('statCard', 'ptile-art', { kind, rank, of, league: league || null });
    if (bg) t.append(bg);
    t.append(el('div', 'k', label), el('div', 'v', big), el('div', 's', small));
    return t;
  }

  function matchLi(m, names) {
    const li = el('li', 'pmatch ' + (m.won === true ? 'won' : m.won === false ? 'lost' : 'nc'));
    const bg = art('matchRow', 'pmatch-art', { won: m.won, verdict: m.verdict, queue: m.queue });
    if (bg) li.append(bg);
    li.append(el('span', 'pm-res', m.verdict === 'void' ? 'NO CONTEST'
      : (m.won ? 'WIN' : 'LOSS') + (m.verdict === 'forfeit' ? ' · FORFEIT' : '')));
    const vs = el('span', 'pm-vs');
    vs.append('VS ', nameEl(m.them.name, m.them.user, 'pm-name'), el('small', null, names[m.them.pilot] || m.them.pilot));
    li.append(vs,
      el('span', 'pm-me', names[m.pilot] || m.pilot),
      el('span', 'pm-score', m.score ? m.score[0] + '–' + m.score[1] : '—'),
      el('span', 'pm-q', (QUEUE_N[m.queue] || String(m.queue).toUpperCase()) + (m.league ? ' · ' + (LEAGUE_N[m.league] || '') : '')),
      el('span', 'pm-at', dateOf(m.at)));
    return li;
  }

  function renderProfile(box, d) {
    const lad = d.pvp.ladder, placed = !!(lad && lad.league);
    const names = Object.fromEntries(d.game.pilots.map(p => [p.id, p.name]));

    // the header: who, since when, and their league
    const head = el('header', 'phead');
    const banner = art('profileBanner', 'pbanner', { display: d.user.display, user: d.user.name,
      league: placed ? lad.league : null, rating: placed ? lad.rating : null, rank: placed ? lad.rank : null, joined: d.user.joined });
    if (banner) head.append(banner);
    const id = el('div', 'pid');
    const av = art('avatar', 'pavatar', { display: d.user.display, league: placed ? lad.league : null,
      pilot: d.pvp.recent[0] ? d.pvp.recent[0].pilot : null });
    if (av) id.append(av);
    const nm = el('div', 'pnm');
    nm.append(el('h2', 'pname', d.user.display));
    const sub = el('p', 'psub');
    sub.append(el('span', 'acct', '◆ ' + d.user.name), 'JOINED ' + dateOf(d.user.joined));
    if (d.game.callsign && d.game.callsign.toLowerCase() !== d.user.display.toLowerCase())
      sub.append(' · FLIES AS ', el('b', null, d.game.callsign));
    nm.append(sub);
    id.append(nm);
    const lg = el('div', 'plg');
    if (placed) {
      const crest = art('league', 'plg-crest', lad.league);
      if (crest) lg.append(crest);
      const t = el('div', 'plg-t');
      t.append(el('b', 'lg-' + lad.league, LEAGUE_N[lad.league] || lad.league.toUpperCase()),
               el('span', null, fmt(lad.rating) + ' · #' + fmt(lad.rank) + ' OF ' + fmt(lad.of)));
      lg.append(t);
    } else {
      const t = el('div', 'plg-t');
      t.append(el('b', null, lad && lad.placing ? 'BEING PLACED' : 'UNRANKED'),
               el('span', null, lad && lad.placing ? lad.games + ' OF ' + (lad.games + lad.left) + ' MATCHES' : 'NO RANKED MATCHES THIS SEASON'));
      lg.append(t);
    }
    head.append(id, lg);
    box.append(head);

    // the four placements
    const tiles = el('div', 'pstats');
    const [kS, kA, kD] = d.boards;
    for (const [key, kind, label] of [[kS, 'season', 'SEASON · ' + seasonLabel(kS.slice(7))], [kA, 'all', 'ALL-TIME'], [kD, 'day', 'TODAY\'S DAILY']]) {
      const b = d.game.boards[key];
      tiles.append(tile(kind, label, b ? b.rank : 0, b ? b.of : 0,
        b ? '#' + fmt(b.rank) : kind === 'day' ? 'NOT FLOWN' : 'NOT PLACED',
        b ? 'OF ' + fmt(b.of) + ' · BEST ' + fmt(b.score) : '\u00a0', b ? () => jump(key, b) : null));
    }
    tiles.append(tile('pvp', 'PVP · ' + seasonLabel(d.pvp.season), placed ? lad.rank : 0, placed ? lad.of : 0,
      placed ? '#' + fmt(lad.rank) : lad && lad.placing ? 'PLACING' : 'UNRANKED',
      placed ? 'OF ' + fmt(lad.of) + ' · ' + fmt(lad.rating) : lad && lad.placing ? lad.left + ' TO GO' : '\u00a0',
      placed ? () => go('pvp', '', Math.floor((lad.rank - 1) / PAGE) * PAGE, { user: d.user.name }) : null, placed ? lad.league : null));
    box.append(tiles);

    // the hangar and the podiums
    const grid = el('div', 'pgrid');
    const hangar = el('section', 'pcard');
    hangar.append(el('h3', null, 'HANGAR'));
    const ps = el('div', 'ppilots');
    for (const p of d.game.pilots) {
      const f = el('figure', 'ppilot' + (p.owned ? '' : ' locked') + (p.awake ? ' awake' : ''));
      const cv = art('pilotBadge', 'pbadge', { id: p.id, owned: p.owned, awake: p.awake });
      if (cv) f.append(cv);
      f.append(el('figcaption', null, p.name), el('small', null, p.awake ? 'AWAKENED' : p.owned ? 'UNLOCKED' : 'LOCKED'));
      ps.append(f);
    }
    hangar.append(ps);
    const awards = el('section', 'pcard');
    awards.append(el('h3', null, 'AWARDS'));
    if (!d.game.podiums.length) awards.append(el('p', 'pnone', 'No season podiums yet. The top three of each season are kept here.'));
    else {
      const ul = el('ul', 'pawards');
      for (const a of d.game.podiums) {
        const li = el('li');
        const cv = art('award', 'paward', { season: a.season, rank: a.rank, score: a.score });
        if (cv) li.append(cv);
        const t = el('div');
        t.append(el('b', null, ORD(a.rank) + ' · SEASON ' + seasonLabel(a.season)), el('span', null, fmt(a.score)));
        li.append(t);
        ul.append(li);
      }
      awards.append(ul);
    }
    grid.append(hangar, awards);
    box.append(grid);

    // PvP: the record, and the latest matches
    const pv = el('section', 'pcard ppvp');
    pv.append(el('h3', null, 'PVP'));
    const rec = el('div', 'precord');
    const nums = [['MATCHES', fmt(d.pvp.played)], ['WINS', fmt(d.pvp.wins)], ['LOSSES', fmt(d.pvp.losses)],
                  ['WIN RATE', d.pvp.played ? Math.round(d.pvp.wins / d.pvp.played * 100) + '%' : '—']];
    if (lad) nums.push(['RANKED · ' + seasonLabel(d.pvp.season), lad.wins + '–' + lad.losses]);
    for (const [k, v] of nums) { const n = el('div', 'pnum'); n.append(el('b', null, v), el('span', null, k)); rec.append(n); }
    pv.append(rec);
    if (!d.pvp.recent.length) pv.append(el('p', 'pnone', 'No matches yet.'));
    else {
      pv.append(el('h4', null, 'LATEST MATCHES'));
      const ol = el('ol', 'pmatches');
      d.pvp.recent.forEach((m, i) => { const li = matchLi(m, names); li.style.setProperty('--i', i); ol.append(li); });
      pv.append(ol);
    }
    box.append(pv);
  }

  async function profileLoad() {
    const box = $('profile');
    box.textContent = '';
    const back = el('a', 'toboards', '← THE BOARDS');
    back.href = S.back || '#season';
    box.append(back);
    const wait = el('p', 'note', 'LOADING…');
    box.append(wait);
    scrollTo({ top: 0 });
    const ticket = ++S.busy;
    let d;
    try { d = await api('user=' + encodeURIComponent(S.user)); }
    catch (e) {
      if (ticket !== S.busy) return;
      const gone = /no such pilot/.test(e.message);
      wait.textContent = gone ? 'NO PILOT GOES BY “' + S.user.toUpperCase() + '”. A CALLSIGN WITHOUT AN ACCOUNT HAS NO PROFILE.'
        : 'PROFILES CAN\'T BE REACHED RIGHT NOW. TRY AGAIN IN A MOMENT.';
      if (!gone) wait.classList.add('bad');
      return;
    }
    if (ticket !== S.busy) return;
    calendar(d);
    wait.remove();
    renderProfile(box, d);
    document.title = d.user.display + ' · VOIDRUNNER';
  }

  /* --------------------------------- start --------------------------------- */
  // the pictures that stay put: the backdrop, the crest, the podium's canvas, the PvP tab's
  const BACK = art('backdrop', 'art-bg');
  if (BACK) document.body.prepend(BACK);
  const CREST = art('crest', 'crest');
  if (CREST) $('crestSlot').append(CREST);
  const PODIUM = art('podium', 'podium-art', [], 'season');
  if (PODIUM) $('podium').append(PODIUM);
  for (const [id, label] of LEAGUES) {
    const f = el('figure');
    const c = art('league', 'league', id);
    if (c) f.append(c);
    const n = el('span', 'lgn', '—');
    n.id = 'lgn-' + id;
    f.append(el('figcaption', null, label), n);
    $('leagues').append(f);
  }
  requestAnimationFrame(frame);

  document.getElementById('tabs').addEventListener('click', e => {
    const b = e.target.closest('button[data-tab]');
    if (b && b.dataset.tab !== S.tab) go(b.dataset.tab);
  });
  $('which').addEventListener('change', e => go(S.tab, e.target.value));
  $('prev').addEventListener('click', () => go(S.tab, S.id, Math.max(0, S.from - PAGE)));
  $('next').addEventListener('click', () => go(S.tab, S.id, S.from + PAGE));
  $('find').addEventListener('submit', e => {
    e.preventDefault();
    const q = $('q').value.trim();
    if (q) search(q);
    else { $('found').hidden = true; $('found').textContent = ''; }
  });
  addEventListener('hashchange', () => { readHash(); load(); });
  // school filters often block .online; the same page is on workers.dev (README)
  $('school').hidden = location.hostname !== 'voidrunner.online';

  (async () => {
    readHash();
    try {
      const d = await api('list=1');
      calendar(d);
      S.seasons = d.seasons || [];
    } catch (e) { /* the board's own request says so if the server is down */ }
    await load();
    if (S.cal) mine();
  })();
})();
