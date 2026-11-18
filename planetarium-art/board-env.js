/* ==================== THE PLANETARIUM — the board's stand-in for the game ====================
   The review board runs the art outside the game, so these are the names the art and
   the helpers sliced out of index.html read, as plain globals. Each stage sets them to
   its own before it draws: its canvas, its size, its clock, its pilot, its room. Only
   the board has this file: none of it is lifted. */
let ctx = null, W = 1280, H = 720, DPR = 1, uiTime = 0, elapsed = 0, state = 'planet', credits = 420, wave = 12;
let camZoom = 1, PILOTS = [], drawFlashT = 0, stageAbs = 0, P = null;
let enemies = [], ebullets = [], bullets = [], parts = [];
const keys = Object.create(null);
const mouse = { x: -999, y: -999, down: false, wx: 0, wy: 0 };
const isTouch = false;
const WORLD = { w: 2400, h: 1700 };
const arena = { x0: 0, y0: 0, x1: WORLD.w, y1: WORLD.h };
const cam = { x: WORLD.w / 2, y: WORLD.h / 2, sx: 0, sy: 0, trauma: 0 };
const outsideHas = () => false, outsideCall = () => {};
const twinActive = () => P.twin > 0 || P.twinT > 0;
const twinPos = () => ({ x: WORLD.w - P.x, y: WORLD.h - P.y });
function spawnPart(x, y, vx, vy, r, color, life, drag = 0.94) {
  if (parts.length > 700) return null;
  const p = { x, y, vx, vy, r, color, life, max: life, drag };
  parts.push(p);
  return p;
}
