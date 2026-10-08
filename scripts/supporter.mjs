#!/usr/bin/env node
/* ===========================================================================
   THE SUPPORTER FLAG — `npm run supporter -- <account> [--take]`
   (the 'supporter' gate in src/looks.js)

     npm run supporter -- somebody
         flags the account a supporter (a Patreon pledge, given by hand for
         now): every look gated 'supporter' opens for it at once
     npm run supporter -- somebody --take
         takes the flag back: those looks leave its profile on its next view

   The flag is 'supporter' in accounts.perks, the JSON list src/leaderboard.js
   describes. It is added to that list or taken out of it, so whatever else
   the account holds there ('dev', a skin…) stays as it was. The game itself
   drops a perk it does not know, so the flag reaches the looks and nothing
   else.

   Without --remote or --local it only prints the SQL it would run, which can
   be pasted into the D1 console in Cloudflare's dashboard as it is. With one
   of them it runs through wrangler against the `voidrunner` D1 database:
   --local is wrangler dev's copy (add --persist-to <dir> if yours lives
   elsewhere), --remote is the live one.
   ========================================================================= */
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

export const FLAG = 'supporter';
const q = s => "'" + String(s).replace(/'/g, "''") + "'";
const NAME = /^[a-z0-9_-]{3,16}$/i;

// the SQL, one line each (scripts/looks.mjs runs these same strings)
export const readSql = name => `SELECT perks FROM accounts WHERE name = ${q(name.toLowerCase())};`;
export const flagSql = (name, take = false) => {
  const has = `EXISTS (SELECT 1 FROM json_each(accounts.perks) WHERE value = ${q(FLAG)})`;
  return take
    ? `UPDATE accounts SET perks = (SELECT json_group_array(value) FROM json_each(accounts.perks) WHERE value IS NOT ${q(FLAG)}) `
      + `WHERE name = ${q(name.toLowerCase())} AND ${has};`
    : `UPDATE accounts SET perks = json_insert(perks, '$[#]', ${q(FLAG)}) WHERE name = ${q(name.toLowerCase())} AND NOT ${has};`;
};

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const flag = f => { const i = args.indexOf(f); if (i < 0) return false; args.splice(i, 1); return true; };
  const opt = f => { const i = args.indexOf(f); if (i < 0) return null; const v = args[i + 1]; args.splice(i, 2); return v; };
  const REMOTE = flag('--remote'), LOCAL = flag('--local'), TAKE = flag('--take');
  const PERSIST = opt('--persist-to');
  const die = m => { console.error('supporter: ' + m); process.exit(1); };

  const [name] = args;
  if (!name || !NAME.test(name)) die('give an account name (3 to 16 of a-z 0-9 _ -)');
  if (!REMOTE && !LOCAL) {
    console.log(flagSql(name, TAKE));
    console.log('\n(printed only: add --remote for the live database, --local for wrangler dev\'s)');
    process.exit(0);
  }
  /* Everything goes to wrangler as --command, so the live database answers
     with rows (a --file goes through D1's import there, which answers with a
     count, the same as scripts/vault.mjs). Each line here is handed to the
     shell on Windows, so it holds no double quote or percent sign; the name
     in it is checked against a plain pattern first. Its JSON answer is the
     word on whether it worked: on Windows wrangler can crash on its way out
     (a libuv assertion) after it has done its work. */
  const run = cmd => {
    const a = ['wrangler', 'd1', 'execute', 'voidrunner', REMOTE ? '--remote' : '--local', '--command', cmd, '--json', '--yes'];
    if (PERSIST) a.push('--persist-to', PERSIST);
    const r = process.platform === 'win32'
      ? spawnSync(['npx', ...a].map(s => (/[\s"]/.test(s) ? '"' + s.replace(/"/g, '\\"') + '"' : s)).join(' '), { encoding: 'utf8', shell: true })
      : spawnSync('npx', a, { encoding: 'utf8' });
    const at = (r.stdout || '').indexOf('[');
    let out = null;
    try { out = at < 0 ? null : JSON.parse(r.stdout.slice(at)); } catch (e) {}
    if (!Array.isArray(out) || !out.every(x => x && x.success !== false))
      die((r.stderr || r.stdout || 'wrangler failed').trim().split('\n').slice(-6).join('\n'));
    return out;
  };
  const perksOf = () => {
    const rows = run(readSql(name)).flatMap(x => (x && x.results) || []);
    if (!rows.length) return null;
    let list = null;
    try { list = JSON.parse(rows[0].perks); } catch (e) {}
    if (!Array.isArray(list)) die(`${name}'s perks are not a list: ${String(rows[0].perks).slice(0, 80)}`);
    return list;
  };
  const where = REMOTE ? ' (live)' : ' (local)';
  const before = perksOf();
  if (!before) die(`no account named "${name}"`);
  if (before.includes(FLAG) !== TAKE) {
    console.log(name + (TAKE ? ' is not a supporter' : ' is already a supporter') + where + ': perks ' + JSON.stringify(before));
    process.exit(0);
  }
  run(flagSql(name, TAKE));
  const after = perksOf() || [];
  if (after.includes(FLAG) === TAKE) die('the change did not take: perks ' + JSON.stringify(after));
  console.log((TAKE ? 'took the supporter flag from ' : 'flagged a supporter: ') + name + where + ': perks ' + JSON.stringify(after));
}
