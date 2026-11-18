#!/usr/bin/env node
/* THE PLANETARIUM: lifts this folder's art into index.html.

     node planetarium-art/lift.mjs              check: lift it in memory, compile it, check every name the
                                                art calls and declares, and say what it would change
     node planetarium-art/lift.mjs --out FILE   the same, then write the lifted page to FILE (index.html is
                                                left alone): run the suites on it with
                                                node --expose-internals scripts/determinism.mjs FILE
                                                node scripts/zodiac.mjs FILE
     node planetarium-art/lift.mjs --write      the same, into index.html itself

   Every place it touches in index.html is found by a function's name and an exact line. If one has
   moved or changed since the planetarium's logic was built (ef4fde0, with main merged in), it stops
   and changes nothing; README.md says what each edit is for, so it can be made by hand instead. Run it
   once: it refuses a page already lifted. */
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
if (/^const ZA_SKY\b|^function zadBegin\b/m.test(orig)) fail('index.html already has the planetarium\'s art in it (ZA_SKY / zadBegin): lifted already?');

/* ------------------------------------ the art ------------------------------------ */
// in this order (the sky first: the rest draw with it), straight after planetButtons
const BLOCKS = ['sky.js', 'dome.js', 'tray.js', 'field.js', 'fx.js'];
// the placeholders the blocks replace, and the two only the placeholder screen called
const PLACEHOLDERS = ['drawPlanetarium', 'zDrawPlate', 'zButton', 'signTray', 'zDrawWorld', 'zDrawDark'];
// what stays: the plates' and buttons' rects, which the clicks hit as well as the art
const KEEP = ['zPlates', 'planetButtons'];

/* --------------------------- the hook lines, in the logic --------------------------- */
// The events only the logic knows the place of. Each is one zaFx call, which only adds to the art's
// own list (ZAF): it reads and changes nothing the run has. first: a new first line in the function;
// after: a new line after that exact line in it. Every line here is marked THE PLANETARIUM: art.
const HOOKS = [
  { fn: 'zTick', after: "      burst(e.x, e.y, 12, '#fb7185', 300, 3.4, 0.4);",
    add: "      zaFx('gore', e.x, e.y, a);           // THE PLANETARIUM: art (the ram's crescent)" },
  { fn: 'zJudge', after: '  if (!best) return;',
    add: "  zaFx('judge', best.x, best.y, best.r);   // THE PLANETARIUM: art (the pillar, the scales)" },
  { fn: 'zRain', after: '  const tx = clamp(at.x, arena.x0 + 20, arena.x1 - 20), ty = clamp(at.y, arena.y0 + 20, arena.y1 - 20);',
    add: "  zaFx('rain', tx, ty);                    // THE PLANETARIUM: art (out of the dark)" },
  { fn: 'zSting', after: '  e.zSting = 0;',
    add: "  zaFx('sting', e.x, e.y, e.r);            // THE PLANETARIUM: art (the tail)" },
  { fn: 'zOnHit', after: "      floatText(e.x, e.y - e.r - 8, 'REAPED', '#e2e8f0', 15);",
    add: "      zaFx('reap', e.x, e.y, e.r);         // THE PLANETARIUM: art (the scythe-stroke)" },
  { fn: 'zWaveOut', first: "zaFx('wave', x, y, dx, dy);                // THE PLANETARIUM: art (the crescent of water)" },
  { fn: 'zGoldenBull', after: '  credits -= cost;',
    add: "  zaFx('bull', P.x, P.y, cost);            // THE PLANETARIUM: art (the coins)" },
];
// the rest, each an exact text found once in the page
const EDITS = [
  // the logic's header, and the placeholder screen's, saying the art is in
  [`   The art is placeholder, behind the hooks the plan names (drawPlanetarium,
   signTray, zDrawWorld, zDrawDark). A later pass draws it properly.`,
   `   The art is drawn (lifted from planetarium-art/), in the blocks after the
   screen's geometry: the sky (za*), the dome (drawPlanetarium), the tray
   (signTray), the field (zDrawWorld, zDrawDark) and the events (zaFx, called
   from the lines marked THE PLANETARIUM: art). None of it changes the run.`],
  [`/* ======================= THE PLANETARIUM: placeholder screen ======================
   Plain, so the logic can be played: three plates, the switch, the buttons.
   The dome, the real constellations and the tray are the art pass's
   (PLANETARIUM-PLAN.md, The art plan). */`,
   `/* ===================== THE PLANETARIUM: the screen's geometry =====================
   Where the three plates and the buttons stand: the clicks hit these rects, and
   the dome (after them) draws in them. */`],
  // the call sites' notes
  ['  zDrawWorld();         // THE PLANETARIUM: the other doubles, the ring, the deep, the shadows (placeholder)',
   '  zDrawWorld();         // THE PLANETARIUM: the signs and the shadows on the field, and their events'],
  ["  zDrawDark();        // LEO's shadow, SUNLESS: the same way (placeholder)",
   "  zDrawDark();        // LEO's shadow, SUNLESS: the same way; and the dome opening back onto the room"],
  ['  ly = signTray(pad, bw, ly);            // THE PLANETARIUM: the signs held and the shadow (placeholder)',
   '  ly = signTray(pad, bw, ly);            // THE PLANETARIUM: the tray, the signs held in their trines'],
  // run snapshots (lockstep's safety net) leave the art's state on each machine: it holds a canvas,
  // a WeakMap of pilots, and the events with the pilot each belongs to
  ["  'VKZ', 'VKX', 'VKC', 'VKS',            // and the vow's (Z, X, C, SKY CLEAR): canvases, closures, the dead in flight\n",
   "  'VKZ', 'VKX', 'VKC', 'VKS',            // and the vow's (Z, X, C, SKY CLEAR): canvases, closures, the dead in flight\n" +
   "  'ZAD', 'ZAT', 'ZAW', 'ZAF',            // THE PLANETARIUM's art: the dome's beats and sky, the tray, the field's pilots, the events\n"],
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
// back from a line's start over the comment directly above it (no blank line between): // lines, or
// one /* */ block, one line or many
function withComment(s, start) {
  let a = start;
  while (a > 0) {
    const ls = s.lastIndexOf('\n', a - 2) + 1, line = s.slice(ls, a - 1);
    if (/^\s*\/\//.test(line)) { a = ls; continue; }
    if (/^\s*\/\*.*\*\/\s*$/.test(line)) { a = ls; continue; }
    if (/\*\/\s*$/.test(line) && !/\/\*/.test(line)) {           // the end of a block: back to its start
      const open = s.lastIndexOf('/*', ls);
      if (open < 0) break;
      const ols = s.lastIndexOf('\n', open - 1) + 1;
      if (/^\s*$/.test(s.slice(ols, open))) { a = ols; continue; }
    }
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
const MARK = '\u0001';
if (orig.includes(MARK)) fail('index.html has a \\u0001 in it, which this uses as a mark');
function remove(name) {
  const [a, b] = fnSpan(orig, name), from = withComment(orig, a);
  removed.push({ name, lines: orig.slice(from, b).split('\n').length - 1, comment: from < a ? orig.slice(from, orig.indexOf('\n', from)).trim() : '' });
  edits.push([from, b, MARK]);
}
for (const f of BLOCKS) if (/<\/script/i.test(art(f))) fail(f + ' has </script in it, which would end the page\'s script');
for (const n of KEEP) fnSpan(orig, n);
for (const n of PLACEHOLDERS) remove(n);
const [, afterButtons] = fnSpan(orig, 'planetButtons');
edits.push([afterButtons, afterButtons, MARK + BLOCKS.map(f => art(f).trimEnd()).join('\n\n') + MARK]);
for (const [from, to] of EDITS) { const at = once(orig, from, 'an edit'); edits.push([at, at + from.length, to]); }

edits.sort((p, q) => q[0] - p[0] || q[1] - p[1]);
for (let i = 1; i < edits.length; i++) if (edits[i][1] > edits[i - 1][0]) fail('two edits overlap near ' + orig.slice(edits[i][0], edits[i][0] + 60));
let page = orig;
for (const [a, b, t] of edits) page = page.slice(0, a) + t + page.slice(b);
page = page.replace(/[\n\u0001]*\u0001[\n\u0001]*/g, '\n\n');

for (const h of HOOKS) {
  const [a, b] = fnSpan(page, h.fn), body = page.slice(a, b);
  let nb;
  if (h.first) { const nl = body.indexOf('\n'); nb = body.slice(0, nl + 1) + '  ' + h.first + '\n' + body.slice(nl + 1); }
  else {
    const lines = body.split('\n'), at = lines.findIndex(l => l === h.after);
    if (at < 0 || lines.filter(l => l === h.after).length !== 1) fail(`${h.fn}: the line isn't in it once:\n  ${h.after}`);
    lines.splice(at + 1, 0, h.add);
    nb = lines.join('\n');
  }
  page = page.slice(0, a) + nb + page.slice(b);
}

/* ----------------------------------- checking it ----------------------------------- */
// it compiles: each script alone, and the scripts together (one page, one global scope)
const scripts = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
const compile = (code, what) => { try { new vm.Script(code, { filename: what }); } catch (e) { fail('the lifted page doesn\'t compile (' + what + '): ' + e.message); } };
scripts.forEach((code, i) => compile(code, 'script ' + i));
compile(scripts.join('\n;\n'), 'its scripts together');
const all = scripts.join('\n');
const strip = s => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '').replace(/(['"`])(?:\\.|(?!\1)[^\\\n])*\1/g, "''");

// every name the art calls is declared in the lifted page
const SKIP = new Set(['if', 'for', 'while', 'switch', 'return', 'function', 'catch', 'typeof', 'new', 'Map', 'Set', 'WeakSet',
  'WeakMap', 'String', 'Number', 'Boolean', 'Array', 'Object', 'parseInt', 'parseFloat', 'isFinite', 'isNaN', 'Symbol', 'Date', 'fn',
  'pt', 'at', 'pos', 'path', 'ring', 'edge', 'add', 'star', 'wav', 'rOf', 'wOf', 'X', 'Y', 'proj', 'zaE', 'zaO', 'zaQ', 'zaIn', 'zaBack',
  'zaH', 'zaZig', 'zaEl']);
const artText = strip(BLOCKS.map(art).join('\n'));
const called = [...new Set([...artText.matchAll(/(?<![.\w$])([A-Za-z_$][\w$]*)\s*\(/g)].map(m => m[1]))].filter(n => !SKIP.has(n));
const declared = n => new RegExp('(function\\s+' + n + '\\b|(const|let|var)\\s+' + n + '\\b|[,{]\\s*' + n + '\\s*=[^=>])').test(all);
// and the methods the art's own tables are written with (ZAF_DRAW's gore(f, age, q) { ... })
const method = n => new RegExp('\\n[ \\t]+' + n + '\\s*\\([^)]*\\)\\s*\\{').test(artText);
const missing = called.filter(n => !declared(n) && !method(n));
if (missing.length) fail('the art calls what the lifted page doesn\'t have: ' + missing.join(', '));
// the arrow helpers the SKIP list lets through are the art's own: they must be declared by it
for (const n of ['zaE', 'zaO', 'zaQ', 'zaIn', 'zaBack', 'zaH', 'zaZig', 'zaEl'])
  if (!new RegExp('^const ' + n + ' = ', 'm').test(page)) fail('the art\'s helper ' + n + ' isn\'t declared in the lifted page');

// functions and top-level names: each the art declares is in the lifted page once, and none was in
// index.html already unless the art replaces it
const fnNames = s => [...s.matchAll(/^function\s+([\w$]+)\s*\(/gm)].map(m => m[1]);
const topNames = s => [...s.matchAll(/^(?:const|let)\s+([\w$]+)/gm)].map(m => m[1]);
const tally = (s, f) => f(s).reduce((m, n) => m.set(n, (m.get(n) || 0) + 1), new Map());
const artFns = [...new Set(BLOCKS.flatMap(f => fnNames(art(f))))], artTop = [...new Set(BLOCKS.flatMap(f => topNames(art(f))))];
const replaced = new Set(PLACEHOLDERS);
const fb = tally(orig, fnNames), fa = tally(page, fnNames), tb = tally(orig, topNames), ta = tally(page, topNames);
const clash = artFns.filter(n => !replaced.has(n) && fb.get(n)).concat(artTop.filter(n => tb.get(n)));
if (clash.length) fail('the art declares names index.html already has: ' + clash.join(', '));
const notOnce = artFns.filter(n => fa.get(n) !== 1).concat(artTop.filter(n => ta.get(n) !== 1));
if (notOnce.length) fail('in the lifted page more or less than once: ' + notOnce.join(', '));
// the art's top-level lets are this machine's own, never the run's
for (const n of artTop.filter(n => new RegExp('^let ' + n + '\\b', 'm').test(BLOCKS.map(art).join('\n'))))
  if (!new RegExp("'" + n + "'").test(page.slice(page.indexOf('const SNAP_LOCAL = new Set(['), page.indexOf(']);', page.indexOf('const SNAP_LOCAL = new Set([')))))
    fail(n + ' is a top-level let of the art\'s that run snapshots would carry: it belongs in SNAP_LOCAL');

/* ----------------------------------- saying so ----------------------------------- */
const lines = s => s.split('\n').length;
console.log(`index.html: ${lines(orig)} lines → ${lines(page)} lifted
  ${BLOCKS.join(', ')}: straight after planetButtons (zPlates and planetButtons stay: the clicks hit them)
  removed: ${removed.map(r => r.name + ' (' + r.lines + (r.comment ? ', with ' + JSON.stringify(r.comment.slice(0, 40)) : '') + ')').join(', ')}
  hook lines: ${HOOKS.length} zaFx calls, in ${new Set(HOOKS.map(h => h.fn)).size} functions; the headers and the call sites' notes;
    ZAD, ZAT, ZAW and ZAF kept out of run snapshots (SNAP_LOCAL)
  checked: it compiles; the art's ${called.length} calls are all declared; its ${artFns.length} functions and ${artTop.length} top-level names are each in it once`);
const out = s => (CRLF ? s.replace(/\n/g, '\r\n') : s);
if (OUT) { fs.writeFileSync(OUT, out(page)); console.log('wrote ' + OUT); }
if (WRITE) { fs.writeFileSync(IDX, out(page)); console.log('wrote index.html'); }
if (!OUT && !WRITE) console.log('(a check: nothing written. --out FILE writes the lifted page there; --write writes index.html)');
