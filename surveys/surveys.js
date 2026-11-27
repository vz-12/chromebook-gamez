/* ===========================================================================
   VOIDRUNNER — the survey results page (/surveys/)

   Asks GET /api/survey?results=1 (src/survey.js) for the answers counted,
   with the bank of questions they answer (src/survey-bank.js), and draws
   each question: an ordered scale as one diverging bar, answers with no
   order as a bar each. SPLIT BY gives a row per pilot, mode, sector and so
   on; the filters keep to one of each. What is chosen stays in the address,
   so a view can be passed to another admin.

   Only an admin's account gets anything; everyone else is told why. Every
   word from the server goes in as text, never as markup.
   ========================================================================= */
(() => {
  const $ = id => document.getElementById(id);
  const el = (tag, cls, text) => {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  };

  // the dimensions the Worker splits and filters by (DIMS in src/survey.js), as people read them
  const DIMS = [['pilot', 'Pilot'], ['mode', 'Mode'], ['party', 'Solo / co-op'], ['sector', 'Sector reached'],
                ['boss', 'Boss up at the end'], ['chal', 'Challenge'], ['exp', 'Experience'], ['device', 'Device'],
                ['ver', 'Game version']];
  const DIM_NAME = Object.fromEntries(DIMS);
  const NAMES = {
    pilot: { runner: 'VOIDRUNNER', ember: 'EMBER', hacker: 'THE HACKER', melee: 'THE VAGRANT' },
    mode: { run: 'Ordinary run', daily: 'Daily run', rush: 'Boss rush', chal: 'Challenge', event: 'Event area' },
    party: { solo: 'Solo', coop: 'Co-op' },
    device: { mouse: 'Mouse & keys', touch: 'Touch', pad: 'Gamepad' }
  };
  const EXP_ORDER = ['under 10 runs', '10-49 runs', '50-199 runs', '200+ runs'];
  const nameOf = (dim, v) => v === '' ? '(none)' : (NAMES[dim] && NAMES[dim][v]) || v;
  const FEW = 5;                         // a group with fewer answers than this is drawn faint
  /* An ordered scale's colours, low to high (surveys.css): blue up to its
     neutral answer (the bank's `mid`, else the centre one of an odd scale),
     gray for that, orange after. Two steps a side at most; a scale that
     needs more is drawn as answers with no order. */
  function steps(q) {
    const n = q.c.length;
    const mid = Number.isInteger(q.mid) && q.mid >= 0 && q.mid < n ? q.mid : n % 2 ? (n - 1) / 2 : -1;
    const lo = mid >= 0 ? mid : n / 2, hi = mid >= 0 ? n - mid - 1 : n / 2;
    const LO = [[], ['lo-1'], ['lo-2', 'lo-1']][lo], HI = [[], ['hi-1'], ['hi-1', 'hi-2']][hi];
    return LO && HI ? [...LO, ...(mid >= 0 ? ['mid'] : []), ...HI] : null;
  }
  const pct = (n, of) => of ? Math.round(n / of * 100) : 0;

  /* ------------------------------ the state ------------------------------ */
  const view = { days: '30', by: '', beta: false, where: {} };
  function fromUrl() {
    const u = new URLSearchParams(location.search);
    if (u.has('days')) view.days = u.get('days');
    if (u.has('by')) view.by = u.get('by');
    view.beta = u.get('beta') === '1';
    for (const [d] of DIMS) if (u.has(d)) view.where[d] = u.get(d);
  }
  function query() {
    const u = new URLSearchParams();
    u.set('days', view.days);
    if (view.by) u.set('by', view.by);
    if (view.beta) u.set('beta', '1');
    for (const [d, v] of Object.entries(view.where)) u.set(d, v);
    return u;
  }

  /* ------------------------------ the tooltip ------------------------------ */
  const tip = $('tip');
  function tipFor(node, value, label, col) {
    node.tabIndex = 0;
    node.setAttribute('aria-label', value + ', ' + label);
    const show = e => {
      tip.replaceChildren();
      tip.appendChild(el('strong', '', value));
      const row = el('div');
      if (col) { const k = el('span', 'key'); k.style.background = col; row.appendChild(k); }
      row.appendChild(document.createTextNode(label));
      tip.appendChild(row);
      tip.hidden = false;
      const r = node.getBoundingClientRect();
      const x = e && e.clientX !== undefined ? e.clientX : r.left + r.width / 2;
      const y = e && e.clientY !== undefined ? e.clientY : r.top;
      const w = tip.offsetWidth, h = tip.offsetHeight;
      tip.style.left = Math.max(8, Math.min(innerWidth - w - 8, x - w / 2)) + 'px';
      tip.style.top = (y - h - 12 < 8 ? y + 18 : y - h - 12) + 'px';
    };
    const hide = () => { tip.hidden = true; };
    node.addEventListener('pointermove', show);
    node.addEventListener('focus', () => show(null));
    node.addEventListener('pointerleave', hide);
    node.addEventListener('blur', hide);
  }
  const cssVar = name => getComputedStyle(document.documentElement).getPropertyValue('--' + name).trim();

  /* ------------------------------ the charts ------------------------------ */
  // a question's words, its {tokens} marked as standing for the run's own
  function title(q) {
    const h = el('h2');
    for (const part of q.t.split(/(\{\w+\})/)) {
      if (/^\{\w+\}$/.test(part)) h.appendChild(el('span', 'tok', '‹' + part.slice(1, -1) + '›'));
      else if (part) h.appendChild(document.createTextNode(part));
    }
    return h;
  }
  const isScale = q => !!(q.scale && steps(q));

  // one whole, its answers in order, each its share; the share printed where it fits
  function segBar(q, counts, thin, group) {
    const total = counts.reduce((a, b) => a + b, 0);
    const bar = el('div', 'seg' + (thin ? ' thin' : ''));
    bar.setAttribute('role', 'img');
    bar.setAttribute('aria-label', (group ? group + ': ' : '') + q.c.map((c, i) => c + ' ' + pct(counts[i], total) + '%').join(', '));
    const st = steps(q);
    counts.forEach((n, i) => {
      if (!n) return;
      const p = n / total * 100;
      const s = el('div', st[i] === 'mid' ? 'mid' : '');
      s.style.flex = n + ' 1 0';
      s.style.background = 'var(--' + st[i] + ')';
      s.dataset.p = Math.round(p) + '%';   // printed only where it fits (fitLabels)
      tipFor(s, Math.round(p) + '%  ·  ' + n + ' answer' + (n === 1 ? '' : 's'), q.c[i] + (group ? '  ·  ' + group : ''), cssVar(st[i]));
      bar.appendChild(s);
    });
    return bar;
  }
  function legend(q) {
    const L = el('div', 'legend');
    const st = steps(q);
    q.c.forEach((c, i) => {
      const s = el('span');
      const sw = el('i');
      sw.style.background = 'var(--' + st[i] + ')';
      s.append(sw, document.createTextNode(c));
      L.appendChild(s);
    });
    return L;
  }
  // an ordered scale's average, 1 to n, and the answer nearest it
  function average(q, counts) {
    const total = counts.reduce((a, b) => a + b, 0);
    if (!total) return null;
    const avg = counts.reduce((a, n, i) => a + n * (i + 1), 0) / total;
    return { avg, near: q.c[Math.min(q.c.length - 1, Math.max(0, Math.round(avg) - 1))] };
  }
  // answers with no order: a bar each, longer for more, from one baseline
  function bars(q, counts) {
    const total = counts.reduce((a, b) => a + b, 0), most = Math.max(1, ...counts);
    const g = el('div', 'bars');
    q.c.forEach((c, i) => {
      g.appendChild(el('div', 'lab', c));
      const track = el('div', 'track'), b = el('div', 'bar');
      b.style.width = (counts[i] / most * 100) + '%';
      if (counts[i]) tipFor(b, pct(counts[i], total) + '%  ·  ' + counts[i] + ' answer' + (counts[i] === 1 ? '' : 's'), c, cssVar('one'));
      track.appendChild(b);
      g.appendChild(track);
      const v = el('div', 'val', pct(counts[i], total) + '% ');
      v.appendChild(el('small', '', String(counts[i])));
      g.appendChild(v);
    });
    return g;
  }
  // split, answers with no order: a table, each cell shaded by its share of the row
  function heat(q, groups) {
    const wrap = el('div', 'heat-wrap'), t = el('table', 'heat');
    const head = el('tr');
    head.appendChild(el('th', '', DIM_NAME[view.by]));
    head.appendChild(el('th', 'n', 'n'));
    for (const c of q.c) head.appendChild(el('th', 'n', c));
    const thead = el('thead'); thead.appendChild(head); t.appendChild(thead);
    const body = el('tbody');
    for (const g of groups) {
      const tr = el('tr', g.total < FEW ? 'few' : '');
      tr.appendChild(el('td', 'g', g.name));
      tr.appendChild(el('td', 'n', String(g.total)));
      g.counts.forEach((n, i) => {
        const share = g.total ? n / g.total : 0;
        const td = el('td', 'cell', pct(n, g.total) + '%');
        td.style.background = 'rgba(51, 140, 237, ' + (0.06 + share * 0.74).toFixed(3) + ')';
        if (share > 0.55) td.style.color = '#05060a';
        tipFor(td, pct(n, g.total) + '%  ·  ' + n + ' answer' + (n === 1 ? '' : 's'), q.c[i] + '  ·  ' + g.name, cssVar('one'));
        tr.appendChild(td);
      });
      body.appendChild(tr);
    }
    t.appendChild(body);
    wrap.appendChild(t);
    return wrap;
  }

  // the rows for one question: per group (or the one '' group), its counts per answer
  function groupsOf(q, rows) {
    const m = new Map();
    for (const r of rows) {
      if (r.q !== q.id || r.a < 0 || r.a >= q.c.length) continue;
      const k = r.k == null ? '' : String(r.k);
      if (!m.has(k)) m.set(k, new Array(q.c.length).fill(0));
      m.get(k)[r.a] += r.n;
    }
    const list = [...m].map(([k, counts]) => ({ k, name: nameOf(view.by, k), counts, total: counts.reduce((a, b) => a + b, 0) }));
    if (view.by === 'exp') list.sort((a, b) => EXP_ORDER.indexOf(a.k) - EXP_ORDER.indexOf(b.k));
    else if (view.by === 'ver') list.sort((a, b) => b.k.localeCompare(a.k, undefined, { numeric: true }));
    else list.sort((a, b) => b.total - a.total);
    return list;
  }

  function card(q, rows) {
    const groups = groupsOf(q, rows);
    const all = new Array(q.c.length).fill(0);
    for (const g of groups) g.counts.forEach((n, i) => { all[i] += n; });
    const total = all.reduce((a, b) => a + b, 0);
    const box = el('article', 'q' + (total ? '' : ' empty'));
    box.appendChild(title(q));
    const meta = el('div', 'meta');
    meta.appendChild(el('span', '', total + ' answer' + (total === 1 ? '' : 's')));
    if (q.when) meta.appendChild(el('span', '', 'asked only about ' + whenText(q.when)));
    const id = el('code', '', q.id); meta.appendChild(id);
    box.appendChild(meta);
    if (!total) { box.appendChild(el('p', 'hint', 'No answers yet in this period.')); return box; }

    const top = all.indexOf(Math.max(...all));
    const read = el('p', 'read');
    if (isScale(q)) {
      const a = average(q, all);
      read.append('Average ', el('b', '', a.avg.toFixed(2) + ' of ' + q.c.length), ', nearest ', el('b', '', '“' + a.near + '”'),
                  '. Said most: ', el('b', '', '“' + q.c[top] + '”'), ' (' + pct(all[top], total) + '%).');
    } else read.append('Said most: ', el('b', '', '“' + q.c[top] + '”'), ' (' + pct(all[top], total) + '%).');
    box.appendChild(read);

    if (isScale(q)) {
      box.appendChild(legend(q));
      box.appendChild(segBar(q, all, false, view.by ? 'everyone' : ''));
      if (view.by) {
        const G = el('div', 'groups');
        for (const g of groups) {
          const few = g.total < FEW ? ' few' : '';
          const a = average(q, g.counts);
          G.appendChild(el('div', 'g' + few, g.name));
          G.appendChild(el('div', 'n' + few, g.total + ' · avg ' + (a ? a.avg.toFixed(2) : '–')));
          const b = segBar(q, g.counts, true, g.name);
          if (few) b.classList.add('few');
          G.appendChild(b);
        }
        box.appendChild(G);
      }
    } else {
      box.appendChild(view.by ? heat(q, groups) : bars(q, all));
    }
    if (!view.by && /\{(boss|chal|pilot|sector)\}/.test(q.t)) {
      const k = /\{(\w+)\}/.exec(q.t)[1];
      box.appendChild(el('p', 'hint', 'Split by ' + DIM_NAME[k === 'sector' ? 'sector' : k] + ' to see each one on its own.'));
    }
    if (view.by && groups.some(g => g.total < FEW)) box.appendChild(el('p', 'hint', 'Faint rows have fewer than ' + FEW + ' answers: read them lightly.'));
    return box;
  }
  function whenText(w) {
    const out = [];
    if (w.mode) out.push(w.mode.map(m => nameOf('mode', m).toLowerCase() + 's').join(' and '));
    if (w.died) out.push('runs that ended in a death');
    if (w.boss) out.push('a boss up at the end');
    if (w.shop) out.push('runs that reached a shop');
    if (w.coop) out.push('co-op');
    if (w.minWave) out.push('wave ' + w.minWave + '+');
    return out.join(', ') || 'some runs';
  }

  /* ------------------------------ the page ------------------------------ */
  function controls(d) {
    $('days').value = view.days;
    const by = $('by');
    by.replaceChildren(new Option('Nothing', ''));
    for (const [k, n] of DIMS) by.appendChild(new Option(n, k));
    by.value = view.by;
    const F = $('filters');
    F.replaceChildren();
    for (const [k, n] of DIMS) {
      const vals = (d.dims && d.dims[k]) || [];
      if (!vals.length && !view.where[k]) continue;
      const lab = el('label', 'ctl');
      lab.appendChild(el('span', '', n.toUpperCase()));
      const s = el('select');
      s.appendChild(new Option('Any', ''));
      for (const [v, c] of vals) s.appendChild(new Option(nameOf(k, v) + ' (' + c + ')', v));
      if (view.where[k] && !vals.some(([v]) => v === view.where[k])) s.appendChild(new Option(nameOf(k, view.where[k]), view.where[k]));
      s.value = view.where[k] || '';
      s.addEventListener('change', () => { if (s.value) view.where[k] = s.value; else delete view.where[k]; load(); });
      lab.appendChild(s);
      F.appendChild(lab);
    }
    $('beta').checked = view.beta;
    const csv = new URLSearchParams({ export: '1', days: view.days });
    if (view.beta) csv.set('beta', '1');
    $('csv').href = '/api/survey?' + csv;
    $('controls').hidden = false;
  }
  function kpis(d) {
    const K = $('kpis');
    K.replaceChildren();
    const answers = (d.rows || []).reduce((a, r) => a + r.n, 0);
    const since = d.since ? new Date(d.since) : null;
    const tiles = [['SURVEYS', d.surveys, 'answered'], ['PLAYERS', d.people, 'who answered'], ['ANSWERS', answers, 'in all'],
                   ['SINCE', since ? since.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'the start',
                    since ? since.toLocaleDateString(undefined, { year: 'numeric' }) : 'all time']];
    for (const [k, v, s] of tiles) {
      const t = el('div', 'kpi');
      t.append(el('div', 'k', k), el('div', 'v', String(v)), el('div', 's', s));
      K.appendChild(t);
    }
    K.hidden = false;
  }
  function say(text, cls, again) {
    const n = $('note');
    n.className = 'note' + (cls ? ' ' + cls : '');
    n.replaceChildren(document.createTextNode(text));
    if (again) {
      const b = el('button', '', 'TRY AGAIN');
      b.type = 'button';
      b.addEventListener('click', load);
      n.appendChild(el('br'));
      n.appendChild(b);
    }
    n.hidden = false;
  }

  /* A part's share is printed inside it only where it fits whole; the rest
     keep theirs in the tooltip and the CSV. Asked again when the page is
     resized. */
  function fitLabels() {
    for (const s of document.querySelectorAll('.seg > div[data-p]')) {
      s.textContent = s.dataset.p;
      if (s.scrollWidth > s.clientWidth) s.textContent = '';
    }
  }
  let fitT = 0;
  addEventListener('resize', () => { clearTimeout(fitT); fitT = setTimeout(fitLabels, 120); });

  let asking = 0;
  async function load() {
    const mine = ++asking;
    history.replaceState(null, '', location.pathname + '?' + query());
    $('sub').textContent = 'COUNTING…';
    let r, d = null;
    try {
      const q = query(); q.set('results', '1');
      r = await fetch('/api/survey?' + q, { cache: 'no-store', credentials: 'same-origin' });
      d = r.ok ? await r.json() : null;
    } catch (e) { r = null; }
    if (mine !== asking) return;
    $('note').hidden = true;
    if (r && r.status === 404) {
      $('sub').textContent = 'ADMINS ONLY';
      $('controls').hidden = true; $('kpis').hidden = true; $('questions').replaceChildren();
      say('These results are for VOIDRUNNER\'s admins. Sign in to an account with the dev perk in the game (ACCOUNT), on this same address, then reload this page.', 'big');
      return;
    }
    if (!d || !d.bank || !Array.isArray(d.bank.questions)) {
      $('sub').textContent = 'OFFLINE';
      say('The results could not be fetched just now.', 'big bad', true);
      return;
    }
    const filt = Object.entries(view.where).map(([k, v]) => DIM_NAME[k] + ': ' + nameOf(k, v));
    $('sub').textContent = ['QUICK SURVEY', view.days === '0' ? 'ALL TIME' : 'LAST ' + view.days + ' DAYS',
                            view.by ? 'BY ' + DIM_NAME[view.by].toUpperCase() : ''].filter(Boolean).join('  ·  ');
    controls(d);
    kpis(d);
    if (filt.length || !view.beta) say([filt.length ? 'Only ' + filt.join(', ') + '.' : '', view.beta ? '' : 'Beta builds left out.'].filter(Boolean).join(' '));
    const Q = $('questions');
    Q.replaceChildren();
    const rows = d.rows || [];
    if (!rows.length) {
      Q.appendChild(el('p', 'note big', 'No survey answers in this period yet. Players are asked every few runs, on the menu.'));
      return;
    }
    // answered questions first, in the bank's order; the ones nobody has answered after
    const has = new Set(rows.map(r => r.q));
    const qs = [...d.bank.questions.filter(q => has.has(q.id)), ...d.bank.questions.filter(q => !has.has(q.id))];
    for (const q of qs) Q.appendChild(card(q, rows));
    fitLabels();
  }

  $('days').addEventListener('change', e => { view.days = e.target.value; load(); });
  $('by').addEventListener('change', e => { view.by = e.target.value; load(); });
  $('beta').addEventListener('change', e => { view.beta = e.target.checked; load(); });
  $('controls').addEventListener('submit', e => e.preventDefault());
  fromUrl();
  load();
})();
