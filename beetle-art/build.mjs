#!/usr/bin/env node
/* Builds the concept board as one self-contained page:
     node beetle-art/build.mjs <out.html>
   The game's own glow helpers and MOTION are sliced out of index.html, so
   the board draws with exactly the code a run would. */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const out = process.argv[2] || path.join(here, 'board.out.html');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');

const fn = name => {
  const a = html.indexOf('\nfunction ' + name + '(');
  if (a < 0) throw new Error('build: no ' + name + ' in index.html');
  return html.slice(a + 1, html.indexOf('\n}\n', a) + 2);
};
// one whole line of index.html, found by how it starts
const line = start => {
  const a = html.indexOf('\n' + start);
  if (a < 0) throw new Error('build: no line ' + start + ' in index.html');
  return html.slice(a + 1, html.indexOf('\n', a + 1));
};
const motionAt = html.indexOf('   MOTION — smooth physics for the art');
const motionEnd = html.indexOf('/* ===================== end of MOTION ===================== */', motionAt);
if (motionAt < 0 || motionEnd < 0) throw new Error('build: MOTION is not in index.html');

const pieces = {
  HELPERS: ['const _glowCache = new Map();', fn('rgba'), fn('glowSprite'), fn('drawGlow'), fn('roundRect'), line('const VENT_BURN_AT ='),
            // OVERDRIVE's beat, as the game has it
            line('const OD_T_DIM ='), line('const OD_T_SPARK ='), line('const OD_T_WINGS ='), line('const osEase ='),
            // the moves' own numbers, and the X that BRAND cuts
            ...html.match(/^const (SCORCH|SCAR|PYRO|STRIKE|BRAND|FUSION|STAR)_[A-Z_]+ += [0-9.]+;.*$/gm), fn('odClipSeg'), fn('odStrikeX')].join('\n'),
  MOTION: html.slice(html.lastIndexOf('/*', motionAt), motionEnd),
  ART: ['beetle.js', 'kills.js', 'overdrive.js', 'kit.js', 'khepri.js', 'ui.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n'),
  BOARD: ['board.js', 'board-kit.js', 'board-khepri.js', 'board-kills.js', 'board-ui.js'].map(f => fs.readFileSync(path.join(here, f), 'utf8')).join('\n')
};
let page = fs.readFileSync(path.join(here, 'board.html'), 'utf8');
for (const [k, v] of Object.entries(pieces)) {
  const mark = '/*@' + k + '@*/';
  if (!page.includes(mark)) throw new Error('build: board.html has no ' + mark);
  page = page.replace(mark, () => v);
}
fs.writeFileSync(out, page);
console.log('board:', out, Math.round(page.length / 1024) + ' KB');
