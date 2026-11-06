/* ===========================================================================
   A FROZEN PLAY PAGE — `node scripts/freeze-play.mjs <commit>`

   A recording (a broadcast's log, a replay) plays only on the build it was
   made on: the engine's text is its build (buildId), and any change to it
   plays the same inputs differently. So a fight worth keeping keeps the page
   it was fought on. This writes PvP's play page as it was at <commit> into

     pvp/site/at/<build>/index.html   the page, from that commit's index.html
                                      by that commit's own scripts/pvp-build.mjs
     pvp/site/at/<build>/js/*.js      PvP's own scripts, as they were then

   served by PvP's Worker at /at/<build>/ (its static assets), with the
   page's script tags pointed at its own copies. The engine's script is left
   byte for byte, so the page's build is the recording's. watch.js sends a
   viewer of a fight from another build there, when it exists.

   A frozen page is made once and never edited: its folder is named for its
   build, and `--check` (run by npm run test:pvp) fails if any page no longer
   hashes to its folder's name, or misses a script it loads. Its files are
   kept byte for byte by git (.gitattributes: -text), so a Windows checkout
   gets the same bytes the Worker serves.

   It talks to today's API (/api/pvp/watch, /api/pvp/pilot): keep those
   answering the way they did.

     node scripts/freeze-play.mjs <commit> [--build <id>]   freeze; with --build,
                                                            refuse unless it is that build
     node scripts/freeze-play.mjs --check                   every frozen page as it should be
   ========================================================================= */
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
export const AT = join(ROOT, 'pvp', 'site', 'at');
const ENGINE = '<script>\n"use strict";\n';
const BUILD = /^[0-9a-z]{1,12}\.[0-9a-z]{1,12}$/;

/* The engine's script, as the browser hands it to itself: the text between
   its tag and the first </script>, its line ends made \n as the HTML parser
   makes them (document.currentScript.text, which is SNAP_SRC). */
export function engineText(page) {
  const src = page.replace(/\r\n?/g, '\n');
  const at = src.indexOf(ENGINE);
  if (at < 0) throw new Error('no engine script in the page');
  const from = at + '<script>'.length, to = src.indexOf('</script>', from);
  if (to < 0) throw new Error('the engine script never ends');
  return src.slice(from, to);
}
// buildId(), as the engine works it out from its own text
export function buildOf(page) {
  const s = engineText(page);
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619) >>> 0; }
  return s.length.toString(36) + '.' + h.toString(36);
}
// the PvP scripts the page loads, all in front of the engine: their paths
const scriptsOf = page => [...page.slice(0, page.indexOf(ENGINE)).matchAll(/<script src="([^"]+)"><\/script>/g)].map(m => m[1]);

const show = (commit, path) => execFileSync('git', ['show', commit + ':' + path],
  { cwd: ROOT, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

async function freeze(commit, want) {
  const sha = execFileSync('git', ['rev-parse', '--verify', commit + '^{commit}'], { cwd: ROOT, encoding: 'utf8' }).trim();
  // that commit's own page builder, so the page is the one PvP's Worker served then
  const tmp = mkdtempSync(join(tmpdir(), 'freeze-play-'));
  let page;
  try {
    const builder = join(tmp, 'pvp-build.mjs');
    writeFileSync(builder, show(sha, 'scripts/pvp-build.mjs'));
    const { buildPlay } = await import(pathToFileURL(builder).href);
    page = buildPlay(show(sha, 'index.html')).replace(/\r\n?/g, '\n');
  } finally { rmSync(tmp, { recursive: true, force: true }); }
  const build = buildOf(page);
  if (want && want !== build) throw new Error('freeze-play: ' + sha.slice(0, 7) + ' is build ' + build + ', not ' + want);
  const dir = join(AT, build), base = '/at/' + build;
  if (existsSync(dir)) throw new Error('freeze-play: ' + build + ' is frozen already (pvp/site/at/' + build + '): a frozen page is never made again');

  const scripts = scriptsOf(page);
  for (const s of scripts) if (!/^\/js\/[\w-]+\.js$/.test(s)) throw new Error('freeze-play: a script from somewhere else: ' + s);
  const head = page.slice(0, page.indexOf(ENGINE)), rest = page.slice(page.indexOf(ENGINE));
  const out = head
    .replace('<!doctype html>\n', '<!doctype html>\n<!-- FROZEN by scripts/freeze-play.mjs: build ' + build + ', PvP\'s play page at ' +
             sha.slice(0, 7) + '. Never edit it: the recordings made on this build play here. -->\n')
    .replace(/<script src="\/js\//g, '<script src="' + base + '/js/') + rest;
  if (buildOf(out) !== build) throw new Error('freeze-play: the engine changed while freezing it');

  mkdirSync(join(dir, 'js'), { recursive: true });
  writeFileSync(join(dir, 'index.html'), out);
  for (const s of scripts) writeFileSync(join(dir, s.slice(1)), show(sha, 'pvp/site' + s).replace(/\r\n?/g, '\n'));
  console.log('freeze-play: build ' + build + ' (' + sha.slice(0, 7) + ') -> pvp/site/at/' + build + '/ (' + Math.round(out.length / 1024) + ' KB, ' + scripts.length + ' scripts)');
}

export function check() {
  const bad = [];
  const builds = existsSync(AT) ? readdirSync(AT, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name) : [];
  for (const b of builds) {
    const page = join(AT, b, 'index.html');
    if (!BUILD.test(b)) { bad.push(b + ': not a build\'s name'); continue; }
    if (!existsSync(page)) { bad.push(b + ': no index.html'); continue; }
    const text = readFileSync(page, 'utf8');
    if (/\r/.test(text)) bad.push(b + ': line ends changed (CR in the page)');
    let got;
    try { got = buildOf(text); } catch (e) { bad.push(b + ': ' + e.message); continue; }
    if (got !== b) bad.push(b + ': the page is build ' + got + ' now');
    const scripts = scriptsOf(text);
    if (!scripts.length) bad.push(b + ': loads none of PvP\'s scripts');
    for (const s of scripts) {
      if (!s.startsWith('/at/' + b + '/js/')) bad.push(b + ': loads ' + s + ', not its own copy');
      else if (!existsSync(join(AT, b, s.slice(('/at/' + b + '/').length)))) bad.push(b + ': ' + s + ' is missing');
    }
  }
  return { builds, bad };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args[0] === '--check') {
    const { builds, bad } = check();
    for (const b of bad) console.error('freeze-play: ' + b);
    console.log('freeze-play: ' + builds.length + ' frozen page' + (builds.length === 1 ? '' : 's') + (bad.length ? ', ' + bad.length + ' wrong' : ', all as frozen'));
    process.exit(bad.length ? 1 : 0);
  }
  const commit = args[0], b = args.indexOf('--build');
  if (!commit || commit.startsWith('-')) { console.error('usage: node scripts/freeze-play.mjs <commit> [--build <id>] | --check'); process.exit(2); }
  freeze(commit, b >= 0 ? args[b + 1] : null).catch(e => { console.error(e.message); process.exit(1); });
}
