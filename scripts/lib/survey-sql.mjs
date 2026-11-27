/* The SQL behind `npm run survey` (scripts/survey.mjs), kept apart so the
   test (scripts/survey-test.mjs) runs exactly what the tool would send. It
   is the Worker's own query (resultsQuery in src/survey.js), with its
   parameters written in: wrangler takes one plain line, so every value is
   held to a plain pattern first. */
import { SURVEY_SCHEMA, resultsQuery, DIMS } from '../../src/survey.js';
import { SURVEY } from '../../src/survey-bank.js';

const PLAIN = /^[A-Za-z0-9 _.:+-]{1,40}$/;
const lit = v => typeof v === 'number' ? String(Math.floor(v)) : "'" + String(v).replace(/'/g, "''") + "'";
const fill = (sql, params) => sql.replace(/\?(\d+)/g, (m, i) => lit(params[Number(i) - 1]));

/* The counts and the totals, for the last `days` (0: all), split by `by`,
   kept to `where`; beta builds only with `beta`. `now` is the tool's clock,
   given so the test can hold it still. */
export function resultsSql({ days = 30, by = '', where = {}, beta = false, now = Date.now() } = {}) {
  if (by && !DIMS.includes(by)) throw new Error(`"${by}" is not one of ${DIMS.join(', ')}`);
  for (const [k, v] of Object.entries(where)) {
    if (!DIMS.includes(k)) throw new Error(`"${k}" is not one of ${DIMS.join(', ')}`);
    if (!PLAIN.test(v)) throw new Error(`"${v}" is not a plain value`);
  }
  const d = Math.floor(Number(days));
  const since = d > 0 ? now - Math.min(d, 3650) * 86400000 : 0;
  const Q = resultsQuery({ since, by, where, beta });
  return { counts: `${SURVEY_SCHEMA}\n${fill(Q.counts, Q.params)};`, totals: `${SURVEY_SCHEMA}\n${fill(Q.totals, Q.params)};` };
}

/* What is printed: each question, its answers with their shares as bars,
   an ordered scale's average; and with --by, a line per group. The test prints
   from rows of its own. */
export function report(rows, totals, { by = '', only = '' } = {}) {
  const out = [];
  const t = totals || {};
  out.push((t.surveys || 0) + ' surveys from ' + (t.people || 0) + ' players');
  const pct = (n, of) => of ? Math.round(n / of * 100) : 0;
  const bar = (n, of) => '█'.repeat(Math.round((of ? n / of : 0) * 20)).padEnd(20, '·');
  for (const q of SURVEY.questions) {
    if (only && q.id !== only) continue;
    const mine = rows.filter(r => r.q === q.id && r.a >= 0 && r.a < q.c.length);
    const all = q.c.map((c, i) => mine.filter(r => r.a === i).reduce((s, r) => s + r.n, 0));
    const total = all.reduce((a, b) => a + b, 0);
    out.push('');
    let head = q.t + '  [' + q.id + ']  ' + total + ' answer' + (total === 1 ? '' : 's');
    const avg = cs => { const n = cs.reduce((a, b) => a + b, 0); return n ? cs.reduce((a, c, i) => a + c * (i + 1), 0) / n : 0; };
    if (q.scale && total) {
      const a = avg(all);
      head += '  ·  average ' + a.toFixed(2) + ' of ' + q.c.length + ' (' + q.c[Math.min(q.c.length - 1, Math.round(a) - 1)] + ')';
    }
    out.push(head);
    if (!total) { out.push('  (no answers)'); continue; }
    const w = Math.max(...q.c.map(c => c.length));
    q.c.forEach((c, i) => out.push('  ' + c.padEnd(w) + '  ' + bar(all[i], total) + ' ' + String(pct(all[i], total)).padStart(3) + '%  ' + all[i]));
    if (!by) continue;
    const groups = [...new Set(mine.map(r => r.k))]
      .map(k => ({ k, cs: q.c.map((c, i) => mine.filter(r => r.k === k && r.a === i).reduce((s, r) => s + r.n, 0)) }))
      .map(g => Object.assign(g, { n: g.cs.reduce((a, b) => a + b, 0) }))
      .sort((x, y) => y.n - x.n);
    out.push('  by ' + by + ':  ' + q.c.map((c, i) => (i + 1) + ' ' + c).join('  ·  '));
    const gw = Math.max(...groups.map(g => String(g.k || '(none)').length));
    for (const g of groups)
      out.push('    ' + String(g.k || '(none)').padEnd(gw) + '  ' + String(g.n).padStart(4) + '  '
        + g.cs.map(n => String(pct(n, g.n)).padStart(3) + '%').join(' ') + (q.scale ? '   avg ' + avg(g.cs).toFixed(2) : '')
        + (g.n < 5 ? '   (few)' : ''));
  }
  return out.join('\n');
}
