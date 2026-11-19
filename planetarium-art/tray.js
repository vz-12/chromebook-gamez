/* ================= THE PLANETARIUM — the tray, in the HUD (art, 18 Nov) =================
   In place of the placeholder signTray(x, w, y), which returns where the HUD's next
   block starts. The signs you hold sit in four little triangles, one an element,
   pointing the way that element's alchemical sign does (fire and air up, earth and
   water down). Each corner is one of the element's three signs: a medallion when you
   hold it (its glyph in its element's ring, three pips round the foot, a gold crown
   at III), an empty socket when you don't. So the tray shows the trines filling up:
   when all three corners are held, the triangle's edges light in the element's
   colour and its name is written under it.
   A shadow is the eclipse laid over its sign's medallion, and a line under the tray:
   its name, and until when.
   On the way out of the dome, the glyph you took flies down from its plate into its
   corner, and the corner flashes (ZAD.fly, set by zDrawDark as the dome closes).
   It reads P.zs, P.zShadow, P.zShadowFixed, SIGNS, Z_EL, zm/zsh/zTri, uiTime and
   ZAD, and changes nothing of the logic's. Art state in ZAT. Needs the sky block.
========================================================================================= */
let ZAT = { at: {}, flashAt: {} };
const ZAT_FLY = 0.85;

function signTray(x, w, y) {
  if (!P.zs) return y;
  const any = SIGNS.some(s => zm(s.id) > 0);
  if (!any && !P.zShadow) return y;
  const m = clamp(w / 24, 7, 12), now = uiTime;
  const step = m * 6.2, top = y + m + 2, bottom = top + m * 3.4;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  let k = 0, anyTri = false;
  for (const el of ['fire', 'earth', 'air', 'water']) {
    const up = el === 'fire' || el === 'air', ox = x + m * 2.5 + k * step, col = ZA_ELCOL[el];
    const pts = up ? [[0, 0], [-1.45, 2.4], [1.45, 2.4]] : [[-1.45, 0], [1.45, 0], [0, 2.4]];
    const ids = Z_EL[el].signs, P3 = pts.map(([px, py]) => [ox + px * m, top + py * m]);
    const tri = zTri(el);
    anyTri = anyTri || tri;
    // the edges: lit when the trine is complete, a faint dashed outline while it fills
    ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(P3[0][0], P3[0][1]); ctx.lineTo(P3[1][0], P3[1][1]); ctx.lineTo(P3[2][0], P3[2][1]); ctx.closePath();
    if (tri) {
      ctx.fillStyle = rgba(col, 0.1); ctx.fill();
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = rgba(col, 0.3 + 0.12 * Math.sin(now * 2.2 + k)); ctx.lineWidth = 4; ctx.stroke();
      ctx.restore();
      ctx.strokeStyle = rgba(col, 0.95); ctx.lineWidth = 1.4; ctx.stroke();
    } else {
      ctx.setLineDash([2, 3]);
      ctx.strokeStyle = rgba(col, 0.28); ctx.lineWidth = 1; ctx.stroke();
      ctx.setLineDash([]);
    }
    ids.forEach((id, j) => {
      const [cx, cy] = P3[j], mag = zm(id);
      ZAT.at[id] = { x: cx, y: cy, r: m };
      const fl = ZAT.flashAt[id] !== undefined ? 1 - zaQ(now, ZAT.flashAt[id], ZAT.flashAt[id] + 0.6) : 0;
      // the glyph that is still in flight lands before its medallion is drawn
      const flying = ZAD.fly && ZAD.fly.id === id && now - ZAD.fly.t < ZAT_FLY;
      if (mag > 0 && !flying) {
        zaMedal(cx, cy, m, id, mag, { shadow: zsh(id) ? 1 : 0, flash: fl });
        if (fl > 0) {
          ctx.save(); ctx.globalCompositeOperation = 'lighter';
          ctx.strokeStyle = rgba(ZAD.fly && ZAD.fly.retro ? ZA_SHADE_HI : ZA_GOLD_PALE, fl); ctx.lineWidth = 2 * fl;
          ctx.beginPath(); ctx.arc(cx, cy, m * (1 + (1 - fl) * 1.6), 0, TAU); ctx.stroke();
          ctx.restore();
        }
      } else {
        // an empty socket: a dotted ring, the glyph faint inside it
        ctx.fillStyle = 'rgba(5,8,16,0.75)';
        ctx.beginPath(); ctx.arc(cx, cy, m * 0.78, 0, TAU); ctx.fill();
        ctx.setLineDash([1.5, 2.5]);
        ctx.strokeStyle = rgba(col, 0.4); ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(cx, cy, m * 0.78, 0, TAU); ctx.stroke();
        ctx.setLineDash([]);
        zaGlyph(id, cx, cy, m * 0.36, col, { a: 0.28, lw: 0.18 });
      }
    });
    if (tri) {
      ctx.font = `800 ${Math.max(7, m * 0.72).toFixed(1)}px ${ZA_FB}`;
      ctx.textAlign = 'center';
      ctx.fillStyle = rgba(col, 0.95);
      ctx.fillText(Z_EL[el].tri, ox, bottom + 9);
    }
    k++;
  }
  y = bottom + (anyTri ? 17 : 5);
  // the shadow carried
  if (P.zShadow) {
    const s = zSign(P.zShadow);
    zaEclipse(x + 6, y + 2, 4.2, 0.9);
    ctx.font = `800 10px ${ZA_FB}`;
    ctx.textAlign = 'left';
    const nm = zHalves(s.shadow)[0];
    ctx.fillStyle = rgba(ZA_SHADE_HI, 0.8 + Math.sin(now * 3) * 0.15);
    ctx.fillText(nm, x + 16, y + 5.5);
    const nw = ctx.measureText(nm).width;
    ctx.font = `500 9.5px ${ZA_FB}`;
    ctx.fillStyle = rgba('#8b7aa8', 0.9);
    ctx.fillText(P.zShadowFixed ? '·  for good' : '·  until the sky turns', x + 22 + nw, y + 5.5);
    y += 16;
  }
  // the glyph you took, flying down out of the dome into its corner
  const F = ZAD.fly;
  if (F && now - F.t < ZAT_FLY + 0.05 && ZAT.at[F.id]) {
    const q = clamp((now - F.t) / ZAT_FLY, 0, 1), e = zaE(q), to = ZAT.at[F.id];
    const mx = lerp(F.x, to.x, 0.25), my = Math.min(F.y, to.y) - 60;
    const pos = u => [(1 - u) * (1 - u) * F.x + 2 * (1 - u) * u * mx + u * u * to.x, (1 - u) * (1 - u) * F.y + 2 * (1 - u) * u * my + u * u * to.y];
    const col = F.retro ? ZA_SHADE_HI : ZA_GOLD_HI;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let j = 1; j <= 9; j++) {
      const [tx, ty] = pos(Math.max(0, e - j * 0.025));
      drawGlow(tx, ty, (26 - j * 2) * (1 - e * 0.5), col, 0.16 * (1 - j / 10));
    }
    ctx.restore();
    const [gx, gy] = pos(e), gs = lerp(30, m * 0.5, e);
    zaGlyph(F.id, gx, gy, gs, col, { lw: 0.15, glow: 1.3, core: 1, retro: F.retro ? 1 : 0 });
    if (q >= 1 && ZAT.flashAt[F.id] !== F.t + ZAT_FLY) ZAT.flashAt[F.id] = F.t + ZAT_FLY;
  }
  ctx.restore();
  return y + 4;
}
/* ============================== end of the tray (zat) ============================== */
