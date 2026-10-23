/* ===========================================================================
   EMBER · THE BLUE BEETLE — kills (BEETLE-PLAN.md, step 3)
     KILLS    a body the beetle kills burns out: its outline flashes cold, it
              breaks into blue cinders that cool to violet and grey as they
              drift off on the flow, and a scorch is left on the floor.
     BOSSES   a boss crumbles to ash from the side the killing blow came from.
              A burning front crosses its body, the shape behind it greying
              and the edge lit blue, and every piece the front passes comes
              away as a flake of ash with an ember in it, carried off the way
              the blow travelled. It is drawn from the body's own shape (the
              poly the game draws it with: radius, sides, angle, colour), so it
              never reads the canvas.

     btlKill(B, e, ang)      an ordinary death (from killBody); ang the blow's heading
     btlBossAsh(B, e, ang)   a boss's death
     btlKillsTick(B, dt)     from btlTick
     btlKillsFloor(B)        world, floor: the scorches
     btlKillsDraw(B)         world, over the bodies: burning bosses, ash, cinders
=========================================================================== */

const BTL_ASH = { sweep: 1.6, cell: 5, grey: '#6b7280', dark: '#1f2937', scorch: 2.2 };

function btlPolyPts(r, n, a) {
  const pts = [];
  for (let i = 0; i < n; i++) pts.push([Math.cos(a + i * TAU / n) * r, Math.sin(a + i * TAU / n) * r]);
  return pts;
}
function btlInPoly(x, y, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}
function btlPolyPath(x, y, r, n, a) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const px = x + Math.cos(a + i * TAU / n) * r, py = y + Math.sin(a + i * TAU / n) * r;
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();
}

/* ================================== KILLS ================================= */
function btlKill(B, e, ang = 0) {
  const sides = e.sides || 6, rot = e.ang || 0, r = e.r || 10;
  B.scorches.push({ x: e.x, y: e.y, r, sides, rot, col: e.col || BTL.cyan, at: B.t });
  if (B.scorches.length > 40) B.scorches.shift();
  const pts = btlPolyPts(r, sides, rot), n = clamp(Math.round(8 + r * 0.8), 8, 40);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0;
    for (let tries = 0; tries < 6; tries++) {
      x = (Math.random() * 2 - 1) * r; y = (Math.random() * 2 - 1) * r;
      if (btlInPoly(x, y, pts)) break;
    }
    const d = Math.hypot(x, y) || 1, out = 30 + Math.random() * 60;
    moPart({ x: e.x + x, y: e.y + y, vx: x / d * out + Math.cos(ang) * 40, vy: y / d * out + Math.sin(ang) * 40 - 18,
             drag: 2.4, flow: 22, fs: 26, life: 0.5 + Math.random() * 0.7, r: 0.9 + Math.random() * 1.6,
             spin: (Math.random() - 0.5) * 10, rot: Math.random() * TAU, layer: 'btlCinder', col: e.col }, B.parts);
  }
  for (let i = 0; i < 3; i++)
    moPart({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 50, vy: -40 - Math.random() * 50, drag: 1.5, flow: 18, fs: 26,
             life: 0.6 + Math.random() * 0.5, r: 1 + Math.random(), layer: 'btlEmber' }, B.parts);
}

/* ================================= BOSSES ================================= */
function btlBossAsh(B, e, ang = 0) {
  const r = e.r || 40, sides = e.sides || 6, rot = e.ang || 0, pts = btlPolyPts(r, sides, rot);
  const cell = Math.max(BTL_ASH.cell, r / 16), dx = Math.cos(ang), dy = Math.sin(ang), cells = [];
  for (let y = -r; y < r; y += cell) for (let x = -r; x < r; x += cell) {
    const cx = x + cell / 2, cy = y + cell / 2;
    if (!btlInPoly(cx, cy, pts)) continue;
    // where along the blow it falls, made ragged so the front is not a ruler
    cells.push({ x: cx, y: cy, d: cx * dx + cy * dy + (btlHash(Math.round(cx * 3.1), Math.round(cy * 7.7)) - 0.5) * cell * 2.5 });
  }
  cells.sort((a, b) => a.d - b.d);
  B.ashes.push({ x: e.x, y: e.y, r, sides, rot, col: e.col || '#f43f5e', ang, cells, cell, i: 0, t: 0,
                 dmin: cells.length ? cells[0].d : -r, dmax: cells.length ? cells[cells.length - 1].d : r });
  if (B.ashes.length > 3) B.ashes.shift();
}
// where the burning front stands on a boss, along its blow
const btlAshFront = a => lerp(a.dmin - a.cell, a.dmax + a.cell, osEase(clamp(a.t / BTL_ASH.sweep, 0, 1)));

function btlKillsTick(B, dt) {
  for (let i = B.scorches.length - 1; i >= 0; i--) if (B.t - B.scorches[i].at > BTL_ASH.scorch) B.scorches.splice(i, 1);
  for (let k = B.ashes.length - 1; k >= 0; k--) {
    const a = B.ashes[k];
    a.t += dt;
    const front = btlAshFront(a), ca = Math.cos(a.ang), sa = Math.sin(a.ang);
    // every piece the front has passed comes away as a flake, carried off downwind
    while (a.i < a.cells.length && a.cells[a.i].d < front) {
      const c = a.cells[a.i++], wind = 55 + Math.random() * 95;
      moPart({ x: a.x + c.x, y: a.y + c.y, vx: ca * wind + (Math.random() - 0.5) * 30, vy: sa * wind - 25 - Math.random() * 35,
               drag: 0.7, flow: 38, fs: 46, life: 1.3 + Math.random() * 1.1, r: a.cell * (0.35 + Math.random() * 0.3),
               spin: (Math.random() - 0.5) * 8, rot: Math.random() * TAU, layer: 'btlAsh', col: a.col }, B.parts);
      if (Math.random() < 0.3)
        moPart({ x: a.x + c.x, y: a.y + c.y, vx: ca * 80 + (Math.random() - 0.5) * 60, vy: sa * 80 - 50, drag: 1.4, flow: 24, fs: 30,
                 life: 0.5 + Math.random() * 0.6, r: 0.8 + Math.random(), layer: 'btlEmber' }, B.parts);
    }
    if (a.t > BTL_ASH.sweep + 0.15) B.ashes.splice(k, 1);
  }
}

function btlKillsFloor(B) {
  if (!B.scorches.length) return;
  ctx.save();
  for (const s of B.scorches) {
    const age = B.t - s.at, fade = 1 - age / BTL_ASH.scorch;
    if (fade <= 0) continue;
    // the scorch it leaves: a dark print of its shape, a cold rim round it
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.35 * fade; ctx.fillStyle = BTL.ink;
    btlPolyPath(s.x, s.y, s.r * 1.05, s.sides, s.rot); ctx.fill();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = 0.25 * fade; ctx.strokeStyle = BTL.violet; ctx.lineWidth = 1.2; ctx.stroke();
    // and the flash of it burning: its outline, cold, thrown outward
    if (age < 0.3) {
      const k = 1 - age / 0.3;
      drawGlow(s.x, s.y, s.r * 2.4, BTL.cyan, 0.45 * k);
      ctx.globalAlpha = 0.85 * k; ctx.strokeStyle = BTL.ice; ctx.lineWidth = 1.6;
      btlPolyPath(s.x, s.y, s.r * (1 + age * 1.6), s.sides, s.rot); ctx.stroke();
    }
  }
  ctx.restore();
}

function btlKillsDraw(B) {
  ctx.save();
  for (const a of B.ashes) {
    const front = btlAshFront(a), u = clamp(a.t / BTL_ASH.sweep, 0, 1), R = a.r * 1.5;
    if (a.t < 0.3) { ctx.globalCompositeOperation = 'lighter'; drawGlow(a.x, a.y, a.r * 3, BTL.ice, 0.5 * (1 - a.t / 0.3)); }
    // what is left of it: its shape beyond the front, ragged, greying as it burns
    ctx.save();
    ctx.translate(a.x, a.y); ctx.rotate(a.ang);
    ctx.beginPath();
    const step = a.cell;
    ctx.moveTo(front + (btlHash(0, 99) - 0.5) * step * 2, -R);
    for (let y = -R; y <= R; y += step) ctx.lineTo(front + (btlHash(Math.round(y / step), 99) - 0.5) * step * 2.4 + Math.sin(y * 0.3 + a.t * 6) * step * 0.4, y);
    ctx.lineTo(R * 1.2, R); ctx.lineTo(R * 1.2, -R); ctx.closePath();
    ctx.clip();
    ctx.rotate(-a.ang);
    const grey = clamp(0.2 + u * 0.75, 0, 1);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.9; ctx.fillStyle = rgba(btlMix(a.col, BTL_ASH.dark, grey), 0.55 + 0.25 * grey);
    btlPolyPath(0, 0, a.r, a.sides, a.rot); ctx.fill();
    ctx.lineWidth = 2.4; ctx.strokeStyle = btlMix(a.col, BTL_ASH.grey, grey); ctx.stroke();
    ctx.globalAlpha = 0.7; ctx.lineWidth = 1.6;
    btlPolyPath(0, 0, a.r * 0.6, a.sides, -a.rot); ctx.stroke();
    ctx.restore();
    // the burning edge: the pieces just ahead of the front, lit
    ctx.globalCompositeOperation = 'lighter';
    for (let i = a.i; i < a.cells.length; i++) {
      const c = a.cells[i];
      if (c.d > front + a.cell * 1.8) break;
      drawGlow(a.x + c.x, a.y + c.y, a.cell * 1.8, BTL.cyan, 0.45);
      ctx.globalAlpha = 0.85; ctx.fillStyle = BTL.ice;
      ctx.fillRect(a.x + c.x - a.cell * 0.18, a.y + c.y - a.cell * 0.18, a.cell * 0.36, a.cell * 0.36);
    }
  }
  ctx.globalCompositeOperation = 'source-over';
  moPartsDraw('btlAsh', btlDrawAshFlake, B.parts);
  ctx.globalCompositeOperation = 'lighter';
  moPartsDraw('btlCinder', btlDrawCinder, B.parts);
  ctx.restore();
}

// a flake of ash: the body's colour going to grey, an ember in it at first
function btlDrawAshFlake(q, k) {
  const age = 1 - k, ember = age < 0.15 ? 1 - age / 0.15 : 0, r = q.r;
  ctx.save();
  ctx.translate(q.x, q.y); ctx.rotate(q.rot);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = clamp(k * 1.3, 0, 0.9);
  ctx.fillStyle = btlMix(btlMix(q.col, '#a5f3fc', ember * 0.7), BTL_ASH.grey, clamp(age * 1.6, 0, 1));
  ctx.beginPath(); ctx.moveTo(-r, -r * 0.6); ctx.lineTo(r * 0.8, -r); ctx.lineTo(r, r * 0.5); ctx.lineTo(-r * 0.7, r); ctx.closePath(); ctx.fill();
  if (ember > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(0, 0, r * 3, BTL.cyan, 0.6 * ember); }
  ctx.restore();
}
// a cinder: blue-hot, cooling through violet to grey
function btlDrawCinder(q, k) {
  const r = q.r * (0.6 + 0.4 * k), col = k > 0.35 ? btlFire(0.15 + (1 - k) * 0.9) : btlMix('#6d28d9', '#4b5563', 1 - k / 0.35);
  if (k > 0.45) drawGlow(q.x, q.y, r * 3.4, BTL.sky, 0.32 * k);
  ctx.save();
  ctx.translate(q.x, q.y); ctx.rotate(q.rot);
  ctx.globalAlpha = clamp(k * 1.4, 0, 1); ctx.fillStyle = col;
  ctx.fillRect(-r * 0.6, -r * 0.6, r * 1.2, r * 1.2);
  ctx.restore();
}
