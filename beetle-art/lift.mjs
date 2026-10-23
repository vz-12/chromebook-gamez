#!/usr/bin/env node
/* ===========================================================================
   KHEPRI — the lift: puts the art into index.html (beetle-art/README.md)

     node beetle-art/lift.mjs             check: lifts it in memory, writes nothing
     node beetle-art/lift.mjs --write     lifts it into index.html

   The art (beetle, kills, overdrive, kit, khepri) and the adapter go in as
   one block straight after MOTION, between the KHEPRI markers; lifting again
   replaces that block. Then a guard goes at the top of each stock draw
   function it takes over and of each of the kit's effects, a tap into
   killBody and one into frame(), and three of the kit's words take their
   colour from btlFxText. Every
   place is found by an exact line; if one has moved, or is already guarded,
   it says which and writes nothing. Before it says yes the page's scripts
   must still parse.
=========================================================================== */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const here = path.dirname(fileURLToPath(import.meta.url)), root = path.join(here, '..');
const file = path.join(root, 'index.html');
const write = process.argv.includes('--write');
let html = fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n');

const OPEN = '/* ===========================================================================\n   KHEPRI — EMBER\'s signature skin';
const CLOSE = '/* ===================== end of KHEPRI ===================== */\n';
const header = `${OPEN} (BEETLE-PLAN.md; the art is beetle-art/, lifted
   by beetle-art/lift.mjs: change it there and lift again, not here)
   A blue beetle for EMBER, made by request for the October season's #1: the
   base hull, its kills, OVERDRIVE and all four of its moves, and V as KHEPRI.
   Worn only by profiles it was granted to (SECRET_SKINS 'ember-gift'), only
   on EMBER, and drawn through the guards at the top of the stock functions
   it takes over (the adapter, at the foot of this block).
=========================================================================== */
`;
const parts = ['beetle.js', 'kills.js', 'overdrive.js', 'kit.js', 'khepri.js', 'ui.js', 'adapter.js']
  .map(f => fs.readFileSync(path.join(here, f), 'utf8').replace(/\r\n/g, '\n').trimEnd() + '\n');
const block = header + '\n' + parts.join('\n') + CLOSE;

const fail = msg => { console.error('lift: ' + msg + '\nNothing was written.'); process.exit(1); };

// the block: replaced if it is there, else straight after MOTION
const at = html.indexOf(OPEN);
if (at >= 0) {
  const end = html.indexOf(CLOSE, at);
  if (end < 0) fail('the KHEPRI block has no end marker');
  html = html.slice(0, at) + block + html.slice(end + CLOSE.length);
} else {
  const motionEnd = '/* ===================== end of MOTION ===================== */\n';
  const m = html.indexOf(motionEnd);
  if (m < 0) fail('MOTION is not in index.html');
  html = html.slice(0, m + motionEnd.length) + '\n' + block + html.slice(m + motionEnd.length);
}

/* The guards: [what to find, exactly once, and the line to put after it].
   A guard already in place is left alone. */
const G = (fn, extra = '') => `function ${fn}() {\n${extra}`;
const guards = [
  ['drawPlayer: the whole pilot', '  if (hlWrSwapTap()) { SkinFx.player(); return; }\n',
   '  if (btlTake(btlDrawPilot)) return;          // KHEPRI: EMBER\'s signature skin is the whole pilot\n'],
  ['drawLance', G('drawLance', "  if (P.weapon !== 'laser') return;\n"),
   '  if (btlTake(btlDrawLance)) return;          // KHEPRI: the flamethrower, the wind-up, OVERDRIVE\'s braid\n'],
  ['odDrawWorld', G('odDrawWorld', '  const q = odPhase();\n  if (!q || !odSeeded) return;\n'),
   '  if (btlTake(() => btlOdFloor(odPools, uiTime, q.life, btlBag().parts))) return;   // KHEPRI: the room burns blue\n'],
  ['odDrawShip', G('odDrawShip', '  const q = odPhase();\n  if (!q || q.open <= 0.001) return;\n'),
   '  if (btlWorn()) return;                       // KHEPRI: its wings of fire are the hull\'s own\n'],
  ['odDrawGrade', G('odDrawGrade'), '  if (btlTake(btlOdDrawGrade)) return;        // KHEPRI: the swarm in place of the spark, a cold grade\n'],
  ['drawOdScars', G('drawOdScars'), '  if (btlTake(btlDrawFloorMarks)) return;     // KHEPRI: its scores, and the scorches its kills leave\n'],
  ['drawOdScorch', G('drawOdScorch'), '  if (btlTake(() => btlScorch(btlBag(), P.odScorch))) return;   // KHEPRI: Z, a bombardier\'s spray\n'],
  ['drawOdPyroMarks', G('drawOdPyroMarks'), '  if (btlTake(() => btlPyroMarks(odPyros))) return;   // KHEPRI: X, fire beetles round the mark\n'],
  ['drawOdPyros', G('drawOdPyros'), '  if (btlTake(() => btlPyros(odPyros, btlBag().parts))) return;\n'],
  ['drawOdStrikeGround', G('drawOdStrikeGround'), '  if (btlWorn()) return;                       // KHEPRI: the beetle\'s take-off is drawOdStrikeHull\'s\n'],
  ['drawOdStrikeHull', G('drawOdStrikeHull'), '  if (btlTake(() => btlStrikeHull(btlBag(), btlMe(), odStrikeAlt(), odStrikeWings()))) return;\n'],
  ['drawOdStrikeMarks', G('drawOdStrikeMarks'), '  if (btlTake(btlDrawStrikeMarks)) return;    // KHEPRI: C, lanes with a mandible\'s hooks\n'],
  ['drawOdStrike', G('drawOdStrike'), '  if (btlTake(() => btlStrikeFoot(P.odStrike, camZoom, uiTime))) return;\n'],
  ['drawOdStrikeCut', G('drawOdStrikeCut'), '  if (btlTake(() => btlStrikeCut(odStrikeBlack(), W, H, uiTime))) return;   // KHEPRI: the shell closing over the view\n'],
  ['drawOdBrandWall', G('drawOdBrandWall'), '  if (btlTake(() => btlBrandWall(odRing))) return;\n'],
  ['drawOdBrandNukeMark', G('drawOdBrandNukeMark'), '  if (btlTake(() => btlBrandNukeMark(P.odStrike, uiTime))) return;\n'],
  ['drawOdBrandNuke', G('drawOdBrandNuke'), '  if (btlTake(() => btlBrandNuke(P.odStrike, uiTime, btlBag().parts))) return;\n'],
  ['drawOdStars', G('drawOdStars'), '  if (btlTake(btlDrawOverBodies)) return;     // KHEPRI: V\'s suns, and the ash and cinders of its kills\n'],
  ['drawOdKitScreen', G('drawOdKitScreen', '  const a = 1 - (uiTime - odScorchLitAt) / 0.35;\n  const b = 1 - (uiTime - odScorchEndAt) / 0.4;\n  if (a <= 0 && b <= 0) return;\n'),
   '  if (btlTake(() => btlKitScreen(a, b, W, H))) return;\n'],
  ['drawOdFusionAura', G('drawOdFusionAura'), '  if (btlTake(() => btlKhepriAura(P, P.odFusion, uiTime))) return;   // KHEPRI: V\n'],
  ['drawOdFusionHull', G('drawOdFusionHull'), '  if (btlTake(() => btlKhepriHull(btlBag(), btlMe(), P.odFusion, uiTime, odFusionThrow))) return;\n'],
  ['drawOdFusionScreen', G('drawOdFusionScreen'), '  if (btlTake(() => btlKhepriScreen(P.odFusion, uiTime, odFusionOutAt, W, H))) return;\n'],
  ['drawOdHud', 'function drawOdHud(pad, ly, bw) {\n',
   '  if (btlTake(() => btlDrawOdHud(pad, ly, bw))) return ly + 54;   // KHEPRI: its heat and its keys\n'],
  ['the HUD\'s vent meter', "  if (P.awake && P.weapon === 'laser' && odKitOn()) ly = drawOdHud(pad, ly, bw);   // heat to spend, the clock, Z X C V\n",
   "  else if (P.awake && P.weapon === 'laser' && btlTake(() => btlDrawVentHud(pad, ly, bw))) ly += 28;   // KHEPRI: the vent, in plates\n"],
  ['drawOdStrikeUi', G('drawOdStrikeUi'), '  if (btlTake(btlDrawStrikeUi)) return;       // KHEPRI: BRAND\'s view, cold, with mandibles at the corners\n'],
  ['drawOdBrandUi', G('drawOdBrandUi'), '  if (btlTake(btlDrawBrandUi)) return;        // KHEPRI: COMBO 1\'s key, a shell\n'],
  ['frame()', "    hlWrFrame();             // ALL HALLOWS: a prize skin's wardrobe, once a frame\n",
   '    btlFrame();              // KHEPRI: EMBER\'s signature skin, once a frame\n']
];
let added = 0;
for (const [name, find, line] of guards) {
  const n = html.split(find).length - 1;
  if (n !== 1) fail(`${name}: expected its line once, found it ${n} times`);
  const i = html.indexOf(find) + find.length;
  if (html.startsWith(line, i)) continue;              // already guarded
  html = html.slice(0, i) + line + html.slice(i);
  added++;
}
/* The kit's effects: a guard at the top of each, after its own first line,
   whatever its arguments are. btlFx runs it as it is and recolours what it
   threw (adapter.js). */
const FX = ['odIgnite', 'odScorchFx', 'odScorchHitFx', 'odScorchEndFx', 'odScarHitFx',
  'odPyroCastFx', 'odPyroEruptFx', 'odPyroHitFx',
  'odStrikeLiftFx', 'odStrikeRiseFx', 'odStrikeAimFx', 'odStrikeMarkFx', 'odStrikeFireFx', 'odStrikeHitFx',
  'odStrikeEndFx', 'odStrikeLandFx',
  'odBrandQueueFx', 'odBrandRingFx', 'odBrandWallFx', 'odBrandWallTouchFx', 'odBrandWallEndFx',
  'odBrandNukeFx', 'odBrandNukeEruptFx', 'odBrandNukeHitFx',
  'odFusionFx', 'odFusionEndFx', 'odFusionAuraHitFx', 'odStarThrowFx', 'odStarEngulfFx', 'odStarBlowFx', 'odStarHitFx'];
for (const fn of FX) {
  const opens = [...html.matchAll(new RegExp('\\nfunction ' + fn + '\\([^)\\n]*\\) \\{\\n', 'g'))];
  if (opens.length !== 1) fail(`${fn}: expected its first line once, found it ${opens.length} times`);
  const i = opens[0].index + opens[0][0].length;
  const line = `  if (btlFx(${fn}, arguments)) return;   // KHEPRI: what it throws, in its colours\n`;
  if (html.startsWith(line, i)) continue;
  html = html.slice(0, i) + line + html.slice(i);
  added++;
}
/* The kit's words and numbers: their colour goes through btlFxText.
   [the stock text, how many times it is there, what it becomes] */
const words = [
  ["floatText(P.x, P.y - 52, 'VENT READY', '#fb923c', 15);", 1, "floatText(P.x, P.y - 52, 'VENT READY', btlFxText('#fb923c'), 15);"],
  ["floatText(e.x, e.y - e.r - 6, Math.round(dps * SCORCH_PROC), '#fdba74', 12);", 2,
   "floatText(e.x, e.y - e.r - 6, Math.round(dps * SCORCH_PROC), btlFxText('#fdba74'), 12);"]
];
for (const [find, n, done] of words) {
  const have = html.split(find).length - 1, did = html.split(done).length - 1;
  if (did === n && !have) continue;
  if (have !== n || did) fail(`expected "${find.slice(0, 50)}…" ${n} times, found it ${have} (and ${did} done)`);
  html = html.split(find).join(done);
  added += n;
}

// killBody: the beetle's own death, or the stock burst
const kb = "  if (e.burn > 0 && e.type !== 'boss') {\n    // burnt out rather than blown up: see shatterBody\n";
const kbDone = "  if (btlKillTap(e)) {\n    // KHEPRI: burnt out in blue cinders, or a boss to ash, its own way\n  } else if (e.burn > 0 && e.type !== 'boss') {\n";
if (!html.includes(kbDone)) {
  if (html.split(kb).length - 1 !== 1) fail('killBody: its burst is not where it was');
  html = html.replace(kb, kbDone + "    // burnt out rather than blown up: see shatterBody\n");
  added++;
}

// the scripts must still parse
const scripts = [...html.matchAll(/<script(?: [^>]*)?>([\s\S]*?)<\/script>/g)].map(m => m[1]).filter(s => s.trim());
for (const [i, s] of scripts.entries()) {
  try { new Function(s); } catch (e) { fail(`script ${i + 1} no longer parses: ${e.message}`); }
}
// every btl* the guards and the adapter call is defined in the block
const calls = new Set([...html.matchAll(/\bbtl[A-Z]\w*(?=\()/g)].map(m => m[0]));
const defs = new Set([...block.matchAll(/(?:function |const )(btl[A-Z]\w*)/g)].map(m => m[1]));
const missing = [...calls].filter(c => !defs.has(c));
if (missing.length) fail('called but never defined: ' + missing.join(', '));

console.log(`lift: the block ${at >= 0 ? 'replaced' : 'added'} (${block.split('\n').length} lines), ${added} guards added, ${scripts.length} scripts parse, ${calls.size} btl* calls all defined`);
if (write) {
  fs.writeFileSync(file, html.replace(/\n/g, '\r\n'));
  console.log('lift: index.html written');
} else console.log('lift: check only; --write to lift it');
