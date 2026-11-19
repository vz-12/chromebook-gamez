#!/usr/bin/env node
/* Builds the review board's script as one file:
     node planetarium-art/build.mjs <out.js> [--page <out.html>]
   The game's own helpers (the glow sprites, roundRect, the text fitting, the
   hulls) and the planetarium's own tables and geometry (SIGNS, Z_EL, zPlates,
   planetButtons, zTwins ...) are sliced out of index.html, so the board draws
   with exactly the code a run would. Then the art, then the board's stages.
   --page also writes a bare page with every stage on it, to open locally. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const args = process.argv.slice(2);
const out = args[0] && !args[0].startsWith('--') ? args[0] : path.join(here, 'board.out.js');
const pageAt = args.indexOf('--page') >= 0 ? args[args.indexOf('--page') + 1] : null;
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

// a whole function, by brace count (strings and comments skipped)
function fn(name) {
  let a = html.indexOf('\nfunction ' + name + '(');
  if (a < 0) throw new Error('build: no function ' + name + ' in index.html');
  a += 1;
  let i = html.indexOf('{', a), depth = 0;
  for (; i < html.length; i++) {
    const c = html[i];
    if (c === '/' && html[i + 1] === '/') { i = html.indexOf('\n', i); continue; }
    if (c === '/' && html[i + 1] === '*') { i = html.indexOf('*/', i) + 1; continue; }
    if (c === "'" || c === '"' || c === '`') {
      for (i++; i < html.length && html[i] !== c; i++) if (html[i] === '\\') i++;
      continue;
    }
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return html.slice(a, i + 1);
  }
  throw new Error('build: unbalanced ' + name);
}
// one whole line, by how it starts
function line(start) {
  const a = html.indexOf('\n' + start);
  if (a < 0) throw new Error('build: no line ' + start + ' in index.html');
  return html.slice(a + 1, html.indexOf('\n', a + 1));
}
// from one line to just before another
function span(from, to) {
  const a = html.indexOf('\n' + from), b = html.indexOf('\n' + to, a);
  if (a < 0 || b < 0) throw new Error('build: no span ' + from);
  return html.slice(a + 1, b);
}

const HELPERS = [
  line('const TAU = '), line('const rnd  = '), line('const rndi = '), line('const clamp = '), line('const lerp = '), line('const len = '),
  span('const COL = {', '/* --------------------------------- arena'),
  'const _glowCache = new Map();', fn('rgba'), fn('glowSprite'), fn('drawGlow'), fn('roundRect'), fn('fitFont'),
  fn('wrapLines'), fn('wrapText'), fn('inRect'), fn('makeBuf'), fn('poly'), fn('hullPath'), fn('drawShipHull')
].join('\n');
const LOGIC = [
  span('const Z_EL = {', '/* ---------------------------------- the reading'),
  line('const zRetroOk = '), line('const zTurnCost = '), line('const zTri = '), line('const zNear = '), line('const Z_DEEP_R = '),
  line('const zOther = '), line('const zVenomCap = '),
  fn('zTwins'), fn('zLeoR'), fn('zCentres'), fn('zTideM'), fn('zTideIn'), fn('zPlates'), fn('planetButtons')
].join('\n');
const ART = ['sky.js', 'dome.js', 'tray.js', 'field.js', 'fx.js'].filter(f => fs.existsSync(path.join(here, f)))
  .map(f => '/* ---- ' + f + ' ---- */\n' + fs.readFileSync(path.join(here, f), 'utf8')).join('\n');
const BOARD = ['board.js', 'board-stages.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n') + '\nzbStart();';

const js = '(function () {\n"use strict";\n' + fs.readFileSync(path.join(here, 'board-env.js'), 'utf8') + '\n' + HELPERS + '\n' + LOGIC + '\n' + ART + '\n' + BOARD + '\n})();\n';
fs.writeFileSync(out, js);
console.log('board script:', out, Math.round(js.length / 1024) + ' KB');
if (pageAt) {
  const stages = [...BOARD.matchAll(/^ZB_STAGE\('([a-z-]+)', (\d+), (\d+)/gm)].map(m => [m[1], +m[2], +m[3]]);
  const page = '<!doctype html><html><head><meta charset="utf-8"><title>planetarium board</title>' +
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Barlow:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400&family=Chakra+Petch:wght@600;700&family=JetBrains+Mono:wght@600;700&display=swap">' +
    '<style>body{margin:0;background:#05060a;color:#94a3b8;font:12px system-ui}h2{font:600 12px system-ui;margin:16px 16px 6px}canvas{display:block;margin:0 16px}</style></head><body>' +
    stages.map(([id, w, h]) => `<h2>${id}</h2><canvas data-za="${id}" style="width:${w}px;height:${h}px"></canvas>`).join('') +
    '<script>' + js + '</script></body></html>';
  fs.writeFileSync(pageAt, page);
  console.log('board page:', pageAt);
}
