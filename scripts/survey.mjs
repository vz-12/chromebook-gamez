#!/usr/bin/env node
/* ===========================================================================
   THE SURVEYS' RESULTS, FROM HERE — `npm run survey -- [options]`
   (src/survey.js; the questions in src/survey-bank.js; the same counts as
   the /surveys/ page)

     --days N             the last N days (default 30; 0 for all time)
     --by <dim>           a row per pilot, mode, party, sector, boss, chal,
                          exp, device or ver under each question
     --<dim> <value>      only answers with that value, e.g. --pilot melee
     --beta               beta builds' answers too
     --question <id>      only that question

   Like `npm run felled`, nothing runs without --remote (the live database)
   or --local (wrangler dev's; add --persist-to <dir> if yours lives
   elsewhere): without either, the SQL is printed.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { resultsSql, report } from './lib/survey-sql.mjs';
import { SURVEY } from '../src/survey-bank.js';
import { DIMS } from '../src/survey.js';

const args = process.argv.slice(2);
const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
const REMOTE = flag('--remote'), LOCAL = flag('--local'), PERSIST = opt('--persist-to');
const die = m => { console.error('survey: ' + m); process.exit(1); };

const days = opt('--days') ?? '30', by = opt('--by') || '', beta = flag('--beta'), only = opt('--question');
const where = {};
for (const d of DIMS) { const v = opt('--' + d); if (v !== null) where[d] = v; }
if (args.length) die('not understood: ' + args.join(' ') + '\n  --days N  --by <' + DIMS.join('|') + '>  --<dim> <value>  --beta  --question <id>  [--remote | --local]');
if (only && !SURVEY.questions.some(q => q.id === only)) die(`no question "${only}" in src/survey-bank.js`);

// one statement list to wrangler as one plain line, and its rows back
function run(sql) {
  const line = sql.replace(/\s+/g, ' ').trim();
  if (/["%]/.test(line)) die('a statement with a double quote or a percent sign cannot go on the command line');
  const a = ['wrangler', 'd1', 'execute', 'voidrunner', REMOTE ? '--remote' : '--local', '--command', line, '--yes', '--json'];
  if (PERSIST) a.push('--persist-to', PERSIST);
  const r = process.platform === 'win32'
    ? spawnSync(['npx', ...a].map(s => (/[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s)).join(' '), { encoding: 'utf8', shell: true, maxBuffer: 16 << 20 })
    : spawnSync('npx', a, { encoding: 'utf8', maxBuffer: 16 << 20 });
  const at = (r.stdout || '').indexOf('[');
  let out = null;
  try { out = at < 0 ? null : JSON.parse(r.stdout.slice(at)); } catch (e) {}
  if (!Array.isArray(out) || !out.every(x => x && x.success !== false))
    die((r.stderr || r.stdout || 'wrangler failed').trim().split('\n').slice(-6).join('\n'));
  return out.flatMap(x => x.results || []);
}

{
  let sql;
  try { sql = resultsSql({ days, by, where, beta }); } catch (e) { die(e.message); }
  if (!REMOTE && !LOCAL) {
    console.log(sql.counts + '\n\n' + sql.totals);
    console.log('\n(printed only: add --remote for the live database, --local for wrangler dev\'s)');
    process.exit(0);
  }
  const rows = run(sql.counts), totals = run(sql.totals)[0];
  const filt = Object.entries(where).map(([k, v]) => k + '=' + v);
  console.log('QUICK SURVEY' + (REMOTE ? ' (live)' : ' (local)') + ' · ' + (Number(days) > 0 ? 'last ' + days + ' days' : 'all time')
    + (filt.length ? ' · only ' + filt.join(', ') : '') + (beta ? ' · beta included' : ''));
  console.log(report(rows, totals, { by, only }));
}
