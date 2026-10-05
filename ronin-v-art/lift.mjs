#!/usr/bin/env node
/* RONIN's V, LAST VOW: lifts this folder's art into index.html.

     node ronin-v-art/lift.mjs              check: lift it in memory, compile it, check every name the
                                            art calls and declares, and say what it would change
     node ronin-v-art/lift.mjs --out FILE   the same, then write the lifted page to FILE (index.html is
                                            left alone): run the suites on it with
                                            node --expose-internals scripts/determinism.mjs FILE
                                            node scripts/lockstep.mjs FILE
     node ronin-v-art/lift.mjs --write      the same, into index.html itself

   Every place it touches in index.html is found by a function's name and an exact line. If one has
   moved or changed since ronin-v's b4b00ba, it stops and changes nothing; README.md says what each
   edit is for, so it can be made by hand instead. Run it once: it refuses a page already lifted. */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const IDX = path.join(here, '..', 'index.html');
const WRITE = args.includes('--write');
const OUT = (() => { const i = args.indexOf('--out'); return i >= 0 ? args[i + 1] : null; })();
const fail = m => { console.error('lift.mjs: ' + m + '\nNothing was written.'); process.exit(1); };

const raw = fs.readFileSync(IDX, 'utf8'), CRLF = raw.includes('\r\n');
const orig = raw.replace(/\r\n/g, '\n');
const art = f => fs.readFileSync(path.join(here, f), 'utf8').replace(/\r\n/g, '\n').replace(/\s+$/, '') + '\n';
if (/VKZ_CRIM|^function vkzScreen\b/m.test(orig)) fail('index.html already has the vow\'s art in it (VKZ_CRIM / vkzScreen): lifted already?');

/* ------------------------------------ the art ------------------------------------ */
// RONIN's own art, with the vow's lines: in place of the three it replaces, where drawRoninUnder was
const HULL = { file: 'hull.js', replaces: ['drawRoninUnder', 'drawRoninHull', 'vraKatana'] };
// the rest, in this order (vow-z.js first: the others add to its VKZ_KANJI as they load), just before
// the end of RONIN'S KIT art hooks, after the placeholders still standing
const BLOCKS = ['model.js', 'cut-in.js', 'vow-z.js', 'vow-x.js', 'vow-c.js', 'sky-clear.js'];
const END_KIT = "/* ====================== end of RONIN'S KIT art hooks ====================== */";
// the placeholders the blocks replace ("V: LAST VOW (placeholders)")
const PLACEHOLDERS = {
  'model.js': ['drawRoninGrave', 'drawRoninVowWorld'],
  'cut-in.js': ['drawRoninVowScreen'],
  'vow-z.js': ['rkvTears', 'roninVowNameFx', 'roninVowBlastFx'],
  'vow-x.js': ['rkvArcs'],
  'sky-clear.js': ['drawRoninSkyClear', 'drawRoninSkyClearScreen', 'roninSkyClearFx', 'roninSkyClearLandFx',
                   'roninSkyClearHitFx', 'roninSkyClearCutFx', 'roninSkyClearPriceFx'],
};
const STILL_PLACEHOLDERS = ['drawRoninVowKey', 'drawRoninVowHud', 'drawRoninBrokenHud', 'roninVowFx', 'roninVowCutFx',
                            'roninGraveHitFx', 'roninGraveBreakFx', 'roninVowEndFx', 'roninUndeadFx'];

/* --------------------------- the hook lines, in RONIN's kit --------------------------- */
// first: a new first line in the function; after: a new line after that exact line in it;
// swap: that exact line in it, changed. Every line here is marked V.
const HOOKS = [
  // the vow's Z (vow-z.js)
  { fn: 'drawRoninScores', first: "vkzFloorFx();                                 // V: the vow's floor: Z's tears, X's rifts, C's cracks" },
  { fn: 'drawRoninScores', after: '  for (const c of roninCleaves) {', add: '    if (c.vow) { vkzFloor(c); continue; }      // V: a vow cleave keeps its own floor' },
  { fn: 'drawRoninCleaves', after: '  for (const c of roninCleaves) {', add: '    if (c.vow) { vkzCleave(c); continue; }     // V: a vow cleave is cut by his rage' },
  { fn: 'roninCleaveFx', first: 'if (c.vow) return vkzCleaveFx(c);             // V' },
  { fn: 'roninStrokeFx', first: 'if (c.vow) return vkzStrokeFx(c, s);          // V' },
  { fn: 'roninCleaveHitFx', first: 'if (c.vow) return vkzHitFx(e, c, s);          // V' },
  { fn: 'drawRoninVowScreen', first: "vkzScreen();                                  // V: the vow's Z and X, on the screen" },
  // the vow's X (vow-x.js)
  { fn: 'drawRoninDashTrail', first: 'vkxTrail(); if (vkxIsVow(P.roninDash)) return;   // V: a vow dash runs as his phantoms' },
  { fn: 'drawRoninSky', first: "vkxSky();                                     // V: the vow's splits, onto the dead" },
  { fn: 'drawRoninSky', swap: '  if (d) {', to: '  if (d && !vkxIsVow(d)) {                     // V: a vow dash has no smear' },
  { fn: 'drawRoninSky', swap: '    if (sp.merged) continue;', to: '    if (sp.merged || vkxIsVow(sp)) continue;   // V: vkxSky draws a vow split' },
  { fn: 'roninSkyFx', first: 'if (vkxIsVow(d)) return vkxSkyFx(d);          // V' },
  { fn: 'roninSkyLandFx', first: 'if (vkxIsVow(d)) return vkxLandFx(d);         // V' },
  { fn: 'roninSplitFx', first: 'if (vkxIsVow(sp)) return vkxSplitFx(sp);      // V' },
  { fn: 'roninSplitHitFx', first: 'if (vkxIsVow(sp)) return vkxHitFx(e, sp, star);   // V' },
  // the vow's C (vow-c.js)
  { fn: 'drawRoninStillUnder', first: 'if (P.roninStill && P.roninStill.vow) return vkcStance(P.roninStill);   // V' },
  { fn: 'drawRoninExecWorld', first: 'if (vkcWorld()) return;                       // V' },
  { fn: 'drawRoninExecScreen', first: 'if (vkcScreen()) return;                      // V' },
  { fn: 'roninStillFx', first: 'if (s.vow) return vkcStillFx(s);              // V' },
  { fn: 'roninStillEndFx', first: 'if (s.vow) return vkcStillEndFx(s);           // V' },
  { fn: 'roninStillCatchFx', first: 'if (x.vow) return vkcCatchFx(x);              // V' },
  { fn: 'roninExecKillFx', first: 'if (x.vow) return vkcKillFx(x);               // V' },
  { fn: 'roninExecEndFx', first: 'if (x.vow) return vkcEndFx(x);                // V' },
  { fn: 'rkcStep', swap: '    if (!w.still) continue;', to: "    if (!w.still || vkcWave(w)) continue;      // V: a vow wave is the vow's own" },
  { fn: 'rkcDrawWaves', swap: '    if (!w.still) continue;', to: "    if (!w.still || vkcWave(w)) continue;      // V: a vow wave is the vow's own" },
  // the cut-in (cut-in.js)
  { fn: 'roninVowFx', first: 'vkvBegin();                                   // V: a new vow, a new plate for the cut' },
];
// the rest, each an exact text found once in the page
const EDITS = [
  // the cut-in runs 4.75 s from the press to the cut
  ['const VOW_T_CUT       = 1.6;     // the press to the vow: the grave going in, the room held',
   'const VOW_T_CUT       = 4.75;    // the press to the vow: the grave going in, the room held (the cut-in)'],
  // the placeholders' header, saying what has its art now
  [`   Placeholder art for V, to be drawn over. The logic calls these and reads
   nothing back from them.
`, `   Placeholder art for V, to be drawn over. The logic calls these and reads
   nothing back from them. Drawn over so far, in the blocks after this one
   (lifted from ronin-v-art/): the grave, the vow on the hull, the cut-in, the
   vow's Z, X and C, and SKY CLEAR; and RONIN's own drawRoninUnder,
   drawRoninHull and vraKatana take the vow's look (their lines marked V).
   The HUD hooks and the other fx hooks here are still placeholders.
`],
  // run snapshots (lockstep's safety net) leave the art's state on each machine, as they do RONIN's
  // other art layers: it holds canvases and closures, and the dead in flight are each machine's own
  ["  'RKA', 'RKC', 'RKV',                   // RONIN's art layers (a WeakMap of wounds, draw closures; V's)\n",
   "  'RKA', 'RKC', 'RKV',                   // RONIN's art layers (a WeakMap of wounds, draw closures; V's)\n" +
   "  'VKZ', 'VKX', 'VKC', 'VKS',            // and the vow's (Z, X, C, SKY CLEAR): canvases, closures, the dead in flight\n"],
  // and C's vow tables, filled as the script loads, as C's own are
  ["const SNAP_TABLES = new Set(['SKY_V', 'RKC_PLAN', 'RKC_DRAW', 'RKC_KILL']);",
   "const SNAP_TABLES = new Set(['SKY_V', 'RKC_PLAN', 'RKC_DRAW', 'RKC_KILL', 'VKC_PLAN', 'VKC_DRAW', 'VKC_KILL']);"],
  // what only the placeholder SKY CLEAR used
  ['let RKV = { beginAt: -9, cutAt: -9, hitAt: -9, hitTextAt: -9, undeadAt: -9, scAt: {}, scCutAt: -9 };',
   'let RKV = { beginAt: -9, cutAt: -9, hitAt: -9, hitTextAt: -9, undeadAt: -9 };'],
  ["const RKV_RED = '#dc2626', RKV_BLOOD = '#7f1d1d', RKV_STONE = '#57534e', RKV_BONE = '#e7e5e4';",
   "const RKV_RED = '#dc2626', RKV_STONE = '#57534e', RKV_BONE = '#e7e5e4';"],
];

/* --------------------------------- reading the page --------------------------------- */
// the index of the brace closing the block that opens at `open` (strings, comments, regex skipped)
function blockEnd(s, open) {
  let depth = 0, prev = '(';
  for (let i = open; i < s.length; i++) {
    const c = s[i], n = s[i + 1];
    if (c === '/' && n === '/') { i = s.indexOf('\n', i); if (i < 0) return -1; continue; }
    if (c === '/' && n === '*') { i = s.indexOf('*/', i + 2) + 1; if (i <= 0) return -1; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < s.length && s[i] !== c; i++) if (s[i] === '\\') i++;
      prev = 'a'; continue;
    }
    if (c === '/' && '(,=:[!&|?{};+-*%<>~^\n'.includes(prev)) {
      let cls = false;
      for (i++; i < s.length; i++) {
        if (s[i] === '\\') { i++; continue; }
        if (s[i] === '[') cls = true; else if (s[i] === ']') cls = false;
        else if (s[i] === '/' && !cls) break;
      }
      prev = 'a'; continue;
    }
    if (c === '{') depth++;
    if (c === '}') { depth--; if (!depth) return i; }
    if (!/\s/.test(c)) prev = c;
  }
  return -1;
}
// a top-level function: [start, end) from `function` to the newline after its closing brace
function fnSpan(s, name) {
  const all = [...s.matchAll(new RegExp('^function ' + name + '\\s*\\(', 'gm'))];
  if (all.length !== 1) fail(`function ${name} is in the page ${all.length} times, not once`);
  const start = all[0].index, close = blockEnd(s, s.indexOf('{', start));
  if (close < 0) fail(`can't find the end of function ${name}`);
  const nl = s.indexOf('\n', close);
  return [start, nl < 0 ? s.length : nl + 1];
}
// back from a line's start over the comment directly above it (no blank line between)
function withComment(s, start) {
  let a = start;
  while (a > 0) {
    const ls = s.lastIndexOf('\n', a - 2) + 1, line = s.slice(ls, a - 1);
    if (/^\s*\/\//.test(line)) { a = ls; continue; }
    if (/^\s*\/\*.*\*\/\s*$/.test(line)) { a = ls; continue; }       // a one-line /* */ comment
    break;
  }
  return a;
}
const once = (s, text, what) => {
  const n = s.split(text).length - 1;
  if (n !== 1) fail(`${what}: found ${n} times, not once:\n  ${text.split('\n')[0]}`);
  return s.indexOf(text);
};

/* ----------------------------------- lifting it ----------------------------------- */
const edits = [];                               // [start, end, text] on the page as it is, applied from the end
const removed = [];
// every cut and every block put in leaves a mark; once all are made, the blank lines round each mark
// become one blank line (index.html's own double blank lines elsewhere are left as they are)
const MARK = '\u0001';
if (orig.includes(MARK)) fail('index.html has a \\u0001 in it, which this uses as a mark');
function remove(name) {
  const [a, b] = fnSpan(orig, name), from = withComment(orig, a);
  removed.push({ name, lines: orig.slice(from, b).split('\n').length - 1, comment: from < a ? orig.slice(from, orig.indexOf('\n', from)).trim() : '' });
  edits.push([from, b, MARK]);
  return from;
}
for (const f of [HULL.file, ...BLOCKS]) if (/<\/script/i.test(art(f))) fail(f + ' has </script in it, which would end the page\'s script');

// hull.js where drawRoninUnder was
const hullAt = Math.min(...HULL.replaces.map(remove));
edits.push([hullAt, hullAt, MARK + art(HULL.file).trimEnd() + MARK]);
// the placeholders out, the blocks in before the end of the kit's hooks
for (const f of BLOCKS) for (const name of PLACEHOLDERS[f] || []) remove(name);
const endAt = once(orig, END_KIT + '\n', "the end of RONIN'S KIT art hooks");
edits.push([endAt, endAt, MARK + BLOCKS.map(f => art(f).trimEnd()).join('\n\n') + MARK]);
for (const [from, to] of EDITS) { const at = once(orig, from, 'an edit'); edits.push([at, at + from.length, to]); }

edits.sort((p, q) => q[0] - p[0] || q[1] - p[1]);
for (let i = 1; i < edits.length; i++) if (edits[i][1] > edits[i - 1][0]) fail('two edits overlap near ' + orig.slice(edits[i][0], edits[i][0] + 60));
let page = orig;
for (const [a, b, t] of edits) page = page.slice(0, a) + t + page.slice(b);
page = page.replace(/[\n\u0001]*\u0001[\n\u0001]*/g, '\n\n');

// the hook lines, into the page as it now is (drawRoninVowScreen is the cut-in's)
for (const h of HOOKS) {
  const [a, b] = fnSpan(page, h.fn), body = page.slice(a, b);
  let nb;
  if (h.first) { const nl = body.indexOf('\n'); nb = body.slice(0, nl + 1) + '  ' + h.first + '\n' + body.slice(nl + 1); }
  else {
    const line = h.after || h.swap, lines = body.split('\n'), at = lines.findIndex(l => l === line);
    if (at < 0 || lines.filter(l => l === line).length !== 1) fail(`${h.fn}: the line isn't in it once:\n  ${line}`);
    if (h.after) lines.splice(at + 1, 0, h.add); else lines[at] = h.to;
    nb = lines.join('\n');
  }
  page = page.slice(0, a) + nb + page.slice(b);
}

/* ----------------------------------- checking it ----------------------------------- */
// it compiles: each script alone, and the two together (one page shares one global scope, so a
// const or let the art declares that the page already has is an error here, as it would be there)
const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const compile = (code, what) => { try { new vm.Script(code, { filename: what }); } catch (e) { fail('the lifted page doesn\'t compile (' + what + '): ' + e.message); } };
scripts.forEach((code, i) => compile(code, 'script ' + i));
compile(scripts.join('\n;\n'), 'its scripts together');
const all = scripts.join('\n');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, "''");

// every name the art calls is declared in the lifted page
const SKIP = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'typeof', 'new', 'Map', 'Set', 'WeakSet',
  'WeakMap', 'String', 'Number', 'Boolean', 'Array', 'Object', 'parseInt', 'parseFloat', 'isFinite', 'isNaN', 'Symbol', 'Date', 'fn']);
const artFiles = [HULL.file, ...BLOCKS], artText = strip(artFiles.map(art).join('\n'));
const called = [...new Set([...artText.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))].filter(n => !SKIP.has(n));
const declared = n => new RegExp('(function\\s+' + n + '\\b|(const|let|var)\\s+' + n + '\\b|[,{]\\s*' + n + '\\s*=[^=>])').test(all);
const missing = called.filter(n => !declared(n));
if (missing.length) fail('the art calls what the lifted page doesn\'t have: ' + missing.join(', '));

// functions: a second declaration of a name is no error in a script (the last one wins), so count
// them. Each the art declares is in the lifted page once, and none was in index.html already unless
// the art replaces it
const fnNames = s => [...s.matchAll(/^function\s+([\w$]+)\s*\(/gm)].map(m => m[1]);
const tally = s => fnNames(s).reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());
const before = tally(orig), after = tally(page);
const artFns = [...new Set(artFiles.flatMap(f => fnNames(art(f))))];
const replacedNames = new Set([...HULL.replaces, ...Object.values(PLACEHOLDERS).flat()]);
const clash = artFns.filter(n => !replacedNames.has(n) && before.get(n));
if (clash.length) fail('the art declares functions index.html already has: ' + clash.join(', '));
const notOnce = artFns.filter(n => after.get(n) !== 1);
if (notOnce.length) fail('in the lifted page more or less than once: ' + notOnce.map(n => n + ' ×' + (after.get(n) || 0)).join(', '));
for (const n of STILL_PLACEHOLDERS) fnSpan(page, n);

/* ----------------------------------- saying so ----------------------------------- */
const lines = s => s.split('\n').length;
console.log(`index.html: ${lines(orig)} lines → ${lines(page)} lifted
  ${HULL.file}: in place of ${HULL.replaces.join(', ')} (RONIN's own art), where drawRoninUnder was
  ${BLOCKS.join(', ')}: before the end of RONIN'S KIT art hooks, in place of
    ${Object.values(PLACEHOLDERS).flat().join(', ')}
  removed: ${removed.map(r => r.name + ' (' + r.lines + (r.comment ? ', with ' + JSON.stringify(r.comment.slice(0, 40)) : '') + ')').join(', ')}
  hook lines: ${HOOKS.length}, in ${new Set(HOOKS.map(h => h.fn)).size} functions; VOW_T_CUT 1.6 → 4.75; the art's state kept out of run snapshots (SNAP_LOCAL, SNAP_TABLES); the placeholders' header; RKV.scAt, RKV.scCutAt and RKV_BLOOD dropped
  checked: it compiles; the art's ${called.length} calls are all declared; its ${artFns.length} functions are each in it once
  still placeholders: ${STILL_PLACEHOLDERS.join(', ')}`);
const out = s => (CRLF ? s.replace(/\n/g, '\r\n') : s);
if (OUT) { fs.writeFileSync(OUT, out(page)); console.log('wrote ' + OUT); }
if (WRITE) { fs.writeFileSync(IDX, out(page)); console.log('wrote index.html'); }
if (!OUT && !WRITE) console.log('(a check: nothing written. --out FILE writes the lifted page there; --write writes index.html)');
