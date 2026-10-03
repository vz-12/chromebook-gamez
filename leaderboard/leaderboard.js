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
                      days), and PvP when it opens. 50 to a page.

   The address keeps the board you are on (#season/2026-10/50), so a link to
   a page is a link to that page. Text from the server only ever goes in as
   text.
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

  // what is showing: the tab, which season or day, and how far down
  const S = { tab: 'season', id: '', from: 0, cal: null, seasons: [], mark: null, busy: 0 };

  function keyOf(tab, id) {
    if (tab === 'all') return 'all';
    if (tab === 'season') return 'season:' + (id || (S.cal && S.cal.season) || '');
    if (tab === 'day') return 'day:' + (id || (S.cal && S.cal.day) || '');
    return tab;
  }
  function nameOf(key) {
    if (key === 'all') return 'ALL-TIME';
    if (key.startsWith('season:')) return 'SEASON · ' + seasonLabel(key.slice(7));
    if (key.startsWith('day:')) return 'DAILY · ' + dayLabel(key.slice(4));
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
    if (!['season', 'all', 'day', 'pvp'].includes(tab)) return;
    S.tab = tab;
    if (tab === 'all') { S.id = ''; S.from = Math.max(0, parseInt(a, 10) || 0); }
    else { S.id = /^\d{4}-\d{2}(-\d{2})?$/.test(a || '') ? a : ''; S.from = Math.max(0, parseInt(b, 10) || 0); }
  }
  function writeHash() {
    const parts = [S.tab];
    if (S.tab === 'season' || S.tab === 'day') parts.push(S.id || '');
    if (S.from) parts.push(String(S.from));
    const h = '#' + parts.join('/').replace(/\/+$/, '');
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
    if (S.tab === 'season' && S.seasons.length) {
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

  function note(text, bad) {
    $('rows').textContent = '';
    const n = $('note');
    n.textContent = text;
    n.className = 'note' + (bad ? ' bad' : '');
    n.hidden = false;
  }

  function row(r) {
    const tr = el('tr');
    if (r.rank <= 3) tr.className = 'p' + r.rank;
    if (S.mark && S.mark.name === r.name && S.mark.score === r.score) tr.classList.add('mark');
    tr.append(el('td', 'r', String(r.rank)));
    const who = el('td');
    who.append(el('span', 'name', r.name));
    if (r.account) {
      const a = el('span', 'acct', '◆ ' + r.account);
      a.title = 'Signed-in account: ' + r.account;
      who.append(a);
    }
    tr.append(who,
      el('td', 'n score', fmt(r.score)), el('td', 'n', fmt(r.wave)),
      el('td', 'opt', r.sector || '—'), el('td', 'n opt', fmt(r.level)),
      el('td', 'n opt', fmt(r.kills)), el('td', 'n opt', clock(r.time)), el('td', 'opt', dateOf(r.at)));
    return tr;
  }

  async function load() {
    tabs();
    writeHash();
    const pvp = S.tab === 'pvp';
    $('pvp').hidden = !pvp;
    $('tableWrap').hidden = pvp;
    $('pager').hidden = true;
    $('count').textContent = '';
    if (pvp) { $('which').hidden = true; return; }
    picker();
    note('LOADING…');
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
    for (const r of d.rows) body.append(row(r));
    const pg = $('pager');
    pg.hidden = d.total <= PAGE;
    $('prev').disabled = S.from <= 0;
    $('next').disabled = S.from + d.rows.length >= d.total;
    $('pos').textContent = fmt(S.from + 1) + '–' + fmt(S.from + d.rows.length) + ' OF ' + fmt(d.total);
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
      const who = el('div', 'who', p.name);
      if (p.account) who.append(el('span', 'acct', '◆ ' + p.account));
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
    $('mine').hidden = false;
  }

  /* --------------------------------- start --------------------------------- */
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
