/* ===========================================================================
   THE SURVEYS — GET/POST /api/survey (index.html, SURVEYS; the questions in
   survey-bank.js; the results at /surveys/ and `npm run survey`)

   Every few runs the menu offers a QUICK SURVEY about the run just flown: a
   few multiple-choice questions, and a challenge pass for finishing it. The
   answers come here, with what the run was (pilot, mode, how far, how long,
   what was up when it ended), so the game can be tuned from them: which
   pilot feels weak, which boss feels cheap, whether the pace is right.
   Never asked mid-run, and never anything typed.

     GET                    the bank: the questions and the rules. Public.
                            -> { v, rules, questions }
     POST { sid, pid, ctx, answers: [{ q, a }] }
                            the game, a survey answered (or turned down part
                            way: what was answered). From one of our own
                            pages, as JSON. Signed in or a guest: `pid` is
                            the save's profile id, and only a one-way hash
                            of the account, or else of it, is kept, to count
                            people and hold one save to a few a day. `sid`
                            is the survey's own id: sent twice, kept once.
                            -> { kept: true } or { kept: false } (over the
                            limit, or nothing in it the bank knows: the
                            game lets it go either way)
     GET ?results=1&days=N&by=<dim>&<dim>=<value>&beta=1
                            an admin's (the 'dev' perk): the answers counted
                            per question, split by one of DIMS and filtered
                            by any of them, over the last N days (0: all).
                            Beta builds' answers only with beta=1.
                            -> { bank, since, surveys, people, by, rows:
                                 [{ q, a, k, n }], dims: { <dim>: [[value, n]] } }
     GET ?export=1&days=N   an admin's: every answer as a CSV file
     GET ?count=1           an admin's: surveys answered in the last 7 days,
                            for the menu's card -> { week }
   Anybody else asking for results gets the vault's 404.

   LIMITS. One save (or account) is kept to WHO_MAX surveys a day and one
   address to IP_MAX (a classroom shares one), through the same counters
   sign-ins use (auth_gate). The game asks far less often than that.
   ========================================================================= */
import { sessionOf, originOk, clientIp, sha256, ensureAuth } from './auth.js';
import { nothing } from './vault.js';
import { PILOTS } from '../pvp/src/rules.js';
import { SURVEY } from './survey-bank.js';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS survey_answers (
     sid     TEXT    NOT NULL,            -- the survey: one per run asked about
     q       TEXT    NOT NULL,            -- the question's id (survey-bank.js)
     a       INTEGER NOT NULL,            -- the answer: its place in the question's list
     at      INTEGER NOT NULL,            -- when it came in
     who     TEXT    NOT NULL,            -- a one-way hash of the account or the save: counts people, names nobody
     pilot   TEXT    NOT NULL DEFAULT '', -- the run's pilot (PILOTS)
     mode    TEXT    NOT NULL DEFAULT '', -- run, daily, rush, chal or event
     party   TEXT    NOT NULL DEFAULT '', -- solo or coop
     sector  TEXT    NOT NULL DEFAULT '', -- the sector the run reached
     boss    TEXT    NOT NULL DEFAULT '', -- the boss that was up when it ended
     chal    TEXT    NOT NULL DEFAULT '', -- the challenge, for one
     exp     TEXT    NOT NULL DEFAULT '', -- how many runs the save had flown, in bands (EXP)
     device  TEXT    NOT NULL DEFAULT '', -- mouse, touch or pad
     ver     TEXT    NOT NULL DEFAULT '', -- the game's version
     beta    INTEGER NOT NULL DEFAULT 0,  -- a beta build's
     wave    INTEGER NOT NULL DEFAULT 0,
     ctx     TEXT,                        -- the rest of the run, as JSON
     PRIMARY KEY (sid, q))`,
  `CREATE INDEX IF NOT EXISTS survey_answers_at ON survey_answers (at)`
];
// the same, for scripts/survey.mjs to put ahead of its own SQL: one line each, comments out
export const SURVEY_SCHEMA = SCHEMA.map(s => s.replace(/--[^\n]*/g, '').replace(/\s+/g, ' ') + ';').join('\n');

let ready = null;
export function ensureSurvey(db) {
  if (!ready) ready = db.batch(SCHEMA.map(s => db.prepare(s))).catch(e => { ready = null; throw e; });
  return ready;
}

// what results may be split and filtered by: columns of the table, every one
export const DIMS = ['pilot', 'mode', 'party', 'sector', 'boss', 'chal', 'exp', 'device', 'ver'];
export const MODES = ['run', 'daily', 'rush', 'chal', 'event'];
const DEVICES = ['mouse', 'touch', 'pad'];
// how far into the game a player is, by the runs their save had flown
export const EXP = [[10, 'under 10 runs'], [50, '10-49 runs'], [200, '50-199 runs'], [Infinity, '200+ runs']];
const expOf = runs => EXP.find(([n]) => runs < n)[1];

const WHO_MAX = 8, IP_MAX = 400, DAY = 24 * 60 * 60 * 1000;
const SID = /^[0-9a-f]{16,40}$/;
const PID = /^[0-9a-f]{16,64}$/;

const reply = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
  status, headers: Object.assign({ 'content-type': 'application/json', 'cache-control': 'no-store' }, extra) });
// a short line of printable text, or ''
const words = (v, n) => typeof v === 'string' ? v.replace(/[\u0000-\u001f\u007f-\u009f]/g, '').trim().slice(0, n) : '';
const count = (v, max) => { const n = Math.floor(Number(v)); return Number.isFinite(n) && n > 0 ? Math.min(n, max) : 0; };
const own = (o, k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(o, k);

/* What the game says the run was, held to plain values. Nothing in it names
   a player: the pilot is one of the game's own (an outside pilot's run is
   never asked about), the rest are counts and the game's own words. */
export function cleanCtx(c) {
  c = c && typeof c === 'object' && !Array.isArray(c) ? c : {};
  return {
    mode: MODES.includes(c.mode) ? c.mode : 'run',
    pilot: own(PILOTS, c.pilot) ? c.pilot : '',
    party: c.coop ? 'coop' : 'solo',
    sector: words(c.sector, 40).toUpperCase(),
    boss: words(c.boss, 40).toUpperCase(),
    chal: words(c.chal, 40).toUpperCase(),
    device: DEVICES.includes(c.device) ? c.device : '',
    ver: typeof c.ver === 'string' && /^[0-9][0-9A-Za-z.-]{0,15}$/.test(c.ver) ? c.ver : '',
    beta: !!c.beta,
    wave: count(c.wave, 1e5), runs: count(c.runs, 1e7), time: count(c.time, 7 * 86400),
    score: count(c.score, 1e13), level: count(c.level, 1e5), kills: count(c.kills, 1e9), loop: count(c.loop, 1e3),
    died: !!c.died, won: !!c.won, hard: !!c.hard
  };
}

// the answers the bank knows, one per question, in the order given
export function cleanAnswers(list) {
  const out = [], seen = new Set();
  for (const x of Array.isArray(list) ? list.slice(0, 12) : []) {
    const q = x && SURVEY.questions.find(z => z.id === x.q);
    const a = x && Number(x.a);
    if (!q || seen.has(q.id) || !Number.isInteger(a) || a < 0 || a >= q.c.length) continue;
    seen.add(q.id);
    out.push({ q: q.id, a });
  }
  return out;
}

/* The counters sign-ins use (auth_gate, src/account.js), each in a window of
   its own. Over either: the survey is let go, not kept. */
async function overLimit(db, keys) {
  const now = Date.now();
  for (const [k, max] of keys) {
    const row = await db.prepare('SELECT n, until FROM auth_gate WHERE k = ?1').bind(k).first();
    if (row && row.until > now && row.n >= max) return true;
  }
  return false;
}
const bump = (db, k, windowMs, now) => db.prepare(
  `INSERT INTO auth_gate (k, n, until) VALUES (?1, 1, ?2)
   ON CONFLICT (k) DO UPDATE SET
     n     = CASE WHEN auth_gate.until <= ?3 THEN 1  ELSE auth_gate.n + 1 END,
     until = CASE WHEN auth_gate.until <= ?3 THEN ?2 ELSE auth_gate.until END`).bind(k, now + windowMs, now);

async function answered(req, env, b) {
  const sid = typeof b.sid === 'string' && SID.test(b.sid) ? b.sid : '';
  if (!sid) return reply({ error: 'bad request' }, 400);
  const s = await sessionOf(req, env, { peek: true }).catch(() => null);
  const pid = typeof b.pid === 'string' && PID.test(b.pid) ? b.pid : '';
  if (!s && !pid) return reply({ error: 'bad request' }, 400);
  const answers = cleanAnswers(b.answers);
  if (!answers.length) return reply({ kept: false });
  const db = env.DB;
  await ensureSurvey(db);
  await ensureAuth(db);
  if (await db.prepare('SELECT 1 AS x FROM survey_answers WHERE sid = ?1 LIMIT 1').bind(sid).first())
    return reply({ kept: true });                       // sent again: already kept
  const who = sha256('survey:' + (s ? 'a:' + s.account.id : 'p:' + pid)).slice(0, 24);
  const kw = 'sv:w:' + who, ki = 'sv:ip:' + clientIp(req);
  if (await overLimit(db, [[kw, WHO_MAX], [ki, IP_MAX]])) return reply({ kept: false });
  const c = cleanCtx(b.ctx), now = Date.now();
  const rest = JSON.stringify({ time: c.time, score: c.score, level: c.level, kills: c.kills, loop: c.loop,
                                runs: c.runs, died: c.died, won: c.won, hard: c.hard });
  await db.batch([
    ...answers.map(x => db.prepare(
      `INSERT OR IGNORE INTO survey_answers (sid, q, a, at, who, pilot, mode, party, sector, boss, chal, exp, device, ver, beta, wave, ctx)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17)`)
      .bind(sid, x.q, x.a, now, who, c.pilot, c.mode, c.party, c.sector, c.boss, c.chal, expOf(c.runs),
            c.device, c.ver, c.beta ? 1 : 0, c.wave, rest)),
    bump(db, kw, DAY, now), bump(db, ki, DAY, now)
  ]);
  return reply({ kept: true });
}

/* The counts behind the results: answers per question and answer, split by
   one dimension (or none) and filtered by any. Shared with `npm run survey`
   (scripts/lib/survey-sql.mjs), which fills the parameters in itself. */
export function resultsQuery({ since = 0, by = '', where = {}, beta = false } = {}) {
  const params = [Math.max(0, Math.floor(Number(since) || 0))], conds = ['at >= ?1'];
  if (!beta) conds.push('beta = 0');
  for (const d of DIMS) {
    const v = where && where[d];
    if (typeof v !== 'string') continue;
    params.push(v.slice(0, 40));
    conds.push(d + ' = ?' + params.length);
  }
  const k = DIMS.includes(by) ? by : '';
  const w = conds.join(' AND ');
  return {
    params,
    counts: `SELECT q, a, ${k || "''"} AS k, COUNT(*) AS n FROM survey_answers WHERE ${w}
              GROUP BY q, a${k ? ', ' + k : ''} ORDER BY q, k, a`,
    totals: `SELECT COUNT(DISTINCT sid) AS surveys, COUNT(DISTINCT who) AS people FROM survey_answers WHERE ${w}`,
    // every value each dimension takes in the window, for the page's filters (unfiltered by them)
    values: `SELECT ${DIMS.join(', ')}, COUNT(*) AS n FROM survey_answers WHERE at >= ?1${beta ? '' : ' AND beta = 0'}
              GROUP BY ${DIMS.join(', ')}`
  };
}

const sinceOf = days => { const d = Math.floor(Number(days)); return d > 0 ? Date.now() - Math.min(d, 3650) * DAY : 0; };

async function results(env, u) {
  const db = env.DB;
  await ensureSurvey(db);
  const since = sinceOf(u.searchParams.has('days') ? u.searchParams.get('days') : 30);
  const by = DIMS.includes(u.searchParams.get('by')) ? u.searchParams.get('by') : '';
  const where = {};
  for (const d of DIMS) if (u.searchParams.has(d)) where[d] = u.searchParams.get(d);
  const beta = u.searchParams.get('beta') === '1';
  const Q = resultsQuery({ since, by, where, beta });
  const [counts, totals, values] = await Promise.all([
    db.prepare(Q.counts).bind(...Q.params).all(),
    db.prepare(Q.totals).bind(...Q.params).all(),
    db.prepare(Q.values).bind(Q.params[0]).all()
  ]);
  const dims = {};
  for (const d of DIMS) {
    const m = new Map();
    for (const r of values.results || []) m.set(r[d], (m.get(r[d]) || 0) + r.n);
    dims[d] = [...m].filter(([v]) => v !== '').sort((x, y) => y[1] - x[1]);
  }
  const t = (totals.results || [])[0] || {};
  return reply({ bank: SURVEY, since, beta, by, where, surveys: t.surveys || 0, people: t.people || 0,
                 rows: (counts.results || []).map(r => ({ q: r.q, a: r.a, k: r.k, n: r.n })), dims });
}

// every answer in the window, one per line, labelled from the bank
const csvCell = v => { const s = String(v == null ? '' : v); return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
export const CSV_HEAD = ['time_utc', 'survey', 'player', 'question', 'asked', 'answer', 'answer_text', 'pilot', 'mode', 'party',
                         'sector', 'boss', 'challenge', 'experience', 'device', 'version', 'beta', 'wave', 'seconds', 'score',
                         'level', 'kills', 'loop', 'runs', 'died', 'won', 'escalated'];
export function csvOf(rows) {
  const lines = [CSV_HEAD.join(',')];
  for (const r of rows) {
    const q = SURVEY.questions.find(z => z.id === r.q) || { t: '', c: [] };
    let c = {};
    try { c = JSON.parse(r.ctx || '{}') || {}; } catch (e) {}
    lines.push([new Date(r.at).toISOString().replace('T', ' ').slice(0, 19), r.sid, r.who, r.q, q.t, r.a, q.c[r.a] || '',
                r.pilot, r.mode, r.party, r.sector, r.boss, r.chal, r.exp, r.device, r.ver, r.beta, r.wave,
                c.time || 0, c.score || 0, c.level || 0, c.kills || 0, c.loop || 0, c.runs || 0,
                c.died ? 1 : 0, c.won ? 1 : 0, c.hard ? 1 : 0].map(csvCell).join(','));
  }
  return lines.join('\r\n') + '\r\n';
}
async function exported(env, u) {
  const db = env.DB;
  await ensureSurvey(db);
  const since = sinceOf(u.searchParams.has('days') ? u.searchParams.get('days') : 0);
  const beta = u.searchParams.get('beta') === '1';
  const res = await db.prepare(`SELECT * FROM survey_answers WHERE at >= ?1${beta ? '' : ' AND beta = 0'} ORDER BY at LIMIT 50000`)
    .bind(since).all();
  return new Response(csvOf(res.results || []), { headers: {
    'content-type': 'text/csv; charset=utf-8', 'cache-control': 'no-store',
    'content-disposition': 'attachment; filename="voidrunner-surveys-' + new Date().toISOString().slice(0, 10) + '.csv"' } });
}

export default async function survey(req, env) {
  if (req.method !== 'GET' && req.method !== 'POST') return nothing();
  const u = new URL(req.url);
  if (req.method === 'GET') {
    const asks = ['results', 'export', 'count'].filter(k => u.searchParams.has(k));
    if (!asks.length) return reply({ v: SURVEY.v, rules: SURVEY.rules, questions: SURVEY.questions }, 200,
                                   { 'cache-control': 'public, max-age=300' });
    const s = await sessionOf(req, env, { peek: true });
    if (!s || !s.account.perks.includes('dev')) return nothing();
    if (asks[0] === 'results') return results(env, u);
    if (asks[0] === 'export') return exported(env, u);
    await ensureSurvey(env.DB);
    const r = await env.DB.prepare('SELECT COUNT(DISTINCT sid) AS n FROM survey_answers WHERE at >= ?1 AND beta = 0')
      .bind(Date.now() - 7 * DAY).first();
    return reply({ week: (r && r.n) || 0 });
  }
  if (!originOk(req)) return nothing();
  // a JSON body, and a small one: a cross-site form can declare neither
  if (!/^application\/json\b/i.test(req.headers.get('content-type') || '')) return nothing();
  let b = null;
  try { const text = await req.text(); b = text.length <= 4096 ? JSON.parse(text) : null; } catch (e) { b = null; }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return reply({ error: 'bad request' }, 400);
  return answered(req, env, b);
}
