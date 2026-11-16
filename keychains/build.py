#!/usr/bin/env python3
"""VOIDRUNNER keychains and minis: the base VOIDRUNNER and EMBER, as printable 3D models.

    python3 keychains/build.py            writes keychains/out/
    python3 keychains/build.py --check    builds everything, checks every shell is closed, writes nothing

Each ship is made twice (VARIANTS): a keychain, which is the arena's hull
exactly, miters and all, hanging from a ring past the nose; and a mini, smaller,
with every corner rounded, that flies flat on a stand of arena floor (STAND).

The ships are the ones in the arena, in the main game's look (not the Ashen
direction): the outline is read straight out of hullPath() in index.html, so a
keychain can never be a hull the game has since redrawn, and the furniture is
hullDetail()'s, line for line. In the game the ship is flat light on the void;
here each kind of light is a layer of its own, in its own colour:

    halo   the glow the hull throws off its own edge (drawPlayer's widening
           strokes), as a translucent plate the ship sits on; it carries the ring
    hull   the dark tinted fill, with hullDetail()'s dark lines cut in as grooves
    neon   the 2.4-wide stroke round the silhouette, and the lit detail lines
    hot    EMBER only: the vane seams that glow when the lance is charged
    light  the canopy and the engine flame

Every part is a closed solid and no two parts overlap, so a multi-colour
slicer takes the .3mf as one object in its colours, and a single-colour
printer takes the merged .stl and still gets the whole relief.

Only numpy. Regions are signed distance fields on a fine grid (so unions,
offsets and cut-outs are min/max), traced back to outlines by marching squares,
simplified, and extruded with caps from a slab sweep that leaves no T-junctions.
"""
import json
import math
import re
import struct
import sys
import zipfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
OUT = HERE / 'out'

GRID = 0.03    # distance-field step, in game units (0.033 mm on a keychain)
TOL = 0.008    # how far a simplified outline may stray, in game units

RIM_W = 2.4        # drawPlayer: ctx.lineWidth = 2.4 for the hull
MITER_LIMIT = 10   # the canvas default; the hull stroke never sets a join
FL = 0.5           # engine flicker, 0.4..1 in the game: a short, sturdy flame

# What is made from each ship. Heights (z) are millimetres up from the back face;
# reaches and radii are game units unless they say mm.
VARIANTS = {
    # the arena's hull exactly, miters and all, hanging nose-up from a ring
    'keychain': dict(
        S=1.1,                        # mm per game unit: EMBER comes out 65 mm tip to tail
        tol=0.01,                     # mm an outline may stray when it is simplified
        z=dict(halo=1.6, floor=2.4, body=3.0, line=3.4, rim=3.8, flame=2.6, ring=2.2),
        dome=1.1,                     # canopy blister above the hull, mm
        glow=1.8, flame_glow=1.1,     # how far the glow plate reaches past the rim, and past the flame
        round=None,
        loop=dict(hole=2.1, outer=4.4, ring=0.9),   # mm: keyring hole radius (4.2 mm hole), loop radius, neon ring width
        socket=None),
    # smaller, every corner rounded, no ring, and a socket in the back for its stand
    'mini': dict(
        S=0.7,
        tol=0.01,
        z=dict(halo=1.2, floor=2.2, body=2.8, line=3.2, rim=3.6, flame=2.0),
        dome=0.8,
        glow=1.4, flame_glow=1.0,
        round=dict(convex=0.4,        # the hull's points: the rim's own round already softens them
                   concave=1.8,       # its notches: wider than the rim, so its outer edge flows through
                   flame=0.8,         # the flame's tip
                   blur=0.9,          # the glow plate's outline, smoothed this much
                   line_mm=0.8),      # no line or groove thinner than this, so it prints
        loop=None,
        socket=dict(r=1.65, depth=1.8)),   # mm: takes the stand's 3.0 mm peg, at the ship's balance point
}

# The mini's stand, in millimetres: a disc of arena floor (its grid cut in) and a
# post, so the ship flies flat, seen from above, the way the game shows it.
STAND = dict(r=13.0, base=2.0, top=0.4, grid=4.0, line=0.5, post_r=2.0, post_h=20.0, peg_r=1.5, peg_h=1.6)

VOID = '#05060a'   # the arena's background (COL.bg)


# --------------------------------------------------------------- the ships
def hull_points(pilot):
    """hullPath(id) from index.html, as a list of (x, y) in game units."""
    src = (ROOT / 'index.html').read_text(encoding='utf8')
    i = src.index('\nfunction hullPath(id) {')
    j = src.index('\n  ctx.closePath();\n}', i)
    body = src[i:j]
    if pilot == 'ember':
        a = body.index("} else if (id === 'ember') {")
        b = body.index("} else if (id === 'melee') {")
    else:
        a = body.rindex('} else {')
        b = len(body)
    nums = re.findall(r'ctx\.(?:moveTo|lineTo)\((-?[\d.]+),\s*(-?[\d.]+)\)', body[a:b])
    pts = [(float(x), float(y)) for x, y in nums]
    if len(pts) != 14:
        sys.exit(f'hullPath({pilot!r}) no longer reads as 14 points; check build.py against index.html')
    return pts


def mix(hex_a, hex_b, t):
    """hex_a laid over hex_b at alpha t, as the canvas composites it."""
    a = [int(hex_a[k:k + 2], 16) for k in (1, 3, 5)]
    b = [int(hex_b[k:k + 2], 16) for k in (1, 3, 5)]
    return '#' + ''.join(f'{round(x * t + y * (1 - t)):02x}' for x, y in zip(a, b))


def mirror(seg):
    (x0, y0), (x1, y1) = seg
    return [seg, ((x0, -y0), (x1, -y1))]


# hullDetail(), transcribed. Segments are drawn as separate subpaths, so each
# is a straight bar with butt ends (the canvas default cap).
PILOTS = {
    'runner': dict(
        name='VOIDRUNNER', col='#67e8f9', filament='cyan',
        grooves=[  # 'rgba(9,15,28,0.8)', lineWidth 1.2: the spine and frame bulkhead
            (((-5, 0), (15, 0)), 1.2),
            (((-1.5, -5.6), (-1.5, 5.6)), 1.2),
        ],
        rects=[(6.4, 2.2, 4.6, 1.5), (6.4, -3.7, 4.6, 1.5)],  # intake slots either side of the canopy
        lines=[(s, 1.1) for s in  # rgba(hullCol, 0.8): the wing spars
               mirror(((5.4, 8.2), (-4.6, 11.8))) + mirror(((2.6, 4.2), (-3.6, 9.2)))],
        hot=[],
        canopy=(3, 0, 3.1, 1.9),  # a blister on the runner
        flames=[[(-6.5, sd * 4.6), (-17 - 5 * FL, sd * 3), (-6.5, sd * 1.7)] for sd in (1, -1)],
        light={'canopy': '#e0f2fe', 'flame': '#e0f2fe'},
    ),
    'ember': dict(
        name='EMBER', col='#f87171', filament='coral red',
        grooves=[(((3, 0), (18, 0)), 3.4)] + [  # the rail's channel down the nose
            (s, 1.6) for i in range(3)       # heat vanes across the hammer shoulders
            for s in mirror(((4.4 - i * 3.6, 6.6 + i * 1.1), (4.4 - i * 3.6 - 2.6, 11.8)))],
        rects=[],
        lines=[(s, 1.0) for s in  # rgba(hullCol, 0.85): the rail and its braces
               mirror(((4, 2), (17.5, 2))) + mirror(((6, 5.4), (12, 3.2)))],
        hot=[(s, 1.2) for s in mirror(((1, 8.4), (-4, 11.4)))],  # '#fb923c': the vanes glow when there is heat in the gun
        canopy=(-1.4, 0, 2.5, 1.8),  # a slit set back behind the rail
        flames=[[(-7, 3.4), (-21 - 7 * FL, 0), (-7, -3.4)]],  # one heavy engine, running hot
        light={'canopy': '#e0f2fe', 'flame': '#fed7aa'},
    ),
}


# ------------------------------------------------------- distance fields
class Field:
    """A grid of sample points; every region is a signed distance on it (< 0 inside)."""

    def __init__(self, x0, x1, y0, y1):
        self.xs = np.arange(x0, x1 + GRID, GRID)
        self.ys = np.arange(y0, y1 + GRID, GRID)
        self.X, self.Y = np.meshgrid(self.xs, self.ys)
        self.X = self.X.astype(np.float64)
        self.Y = self.Y.astype(np.float64)

    def window(self, box, fn):
        """Evaluate fn only near box (x0, y0, x1, y1); far away the region is simply 'outside'."""
        x0, y0, x1, y1 = box
        m = 1.0
        i0 = max(0, np.searchsorted(self.ys, y0 - m) - 1)
        i1 = min(len(self.ys), np.searchsorted(self.ys, y1 + m) + 1)
        j0 = max(0, np.searchsorted(self.xs, x0 - m) - 1)
        j1 = min(len(self.xs), np.searchsorted(self.xs, x1 + m) + 1)
        out = np.full(self.X.shape, 1e3)
        out[i0:i1, j0:j1] = fn(self.X[i0:i1, j0:j1], self.Y[i0:i1, j0:j1])
        return out

    def polygon(self, pts):
        return poly_sdf(self.X, self.Y, pts)

    def polygon_near(self, pts):
        p = np.array(pts)
        return self.window((*p.min(0), *p.max(0)), lambda X, Y: poly_sdf(X, Y, pts))

    def bar(self, a, b, w):
        return bar_sdf(self.X, self.Y, a, b, w)

    def capsule(self, a, b, w):
        """A segment stroked w wide with round ends."""
        (ax, ay), (bx, by) = a, b
        ex, ey = bx - ax, by - ay
        wx, wy = self.X - ax, self.Y - ay
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        return np.hypot(wx - ex * t, wy - ey * t) - w / 2

    def rect(self, x, y, w, h, r=0.0):
        """An axis-aligned box; with r, its corners rounded to r."""
        cx, cy = x + w / 2, y + h / 2
        qx = np.abs(self.X - cx) - (w / 2 - r)
        qy = np.abs(self.Y - cy) - (h / 2 - r)
        return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0) - r

    def circle(self, cx, cy, r):
        return np.hypot(self.X - cx, self.Y - cy) - r


def poly_sdf(X, Y, pts):
    p = np.asarray(pts, dtype=np.float64)
    d2 = np.full(X.shape, np.inf)
    inside = np.zeros(X.shape, dtype=bool)
    n = len(p)
    for k in range(n):
        ax, ay = p[k]
        bx, by = p[(k + 1) % n]
        ex, ey = bx - ax, by - ay
        wx, wy = X - ax, Y - ay
        t = np.clip((wx * ex + wy * ey) / (ex * ex + ey * ey), 0, 1)
        dx, dy = wx - ex * t, wy - ey * t
        d2 = np.minimum(d2, dx * dx + dy * dy)
        if ay != by:
            cross = ((ay > Y) != (by > Y)) & (X < ex * (Y - ay) / ey + ax)
            inside ^= cross
    d = np.sqrt(d2)
    return np.where(inside, -d, d)


def bar_sdf(X, Y, a, b, w):
    """A line segment stroked w wide with butt ends: an oriented box."""
    (ax, ay), (bx, by) = a, b
    L = math.hypot(bx - ax, by - ay)
    ux, uy = (bx - ax) / L, (by - ay) / L
    wx, wy = X - ax, Y - ay
    u = wx * ux + wy * uy
    v = -wx * uy + wy * ux
    qx = np.abs(u - L / 2) - L / 2
    qy = np.abs(v) - w / 2
    return np.hypot(np.maximum(qx, 0), np.maximum(qy, 0)) + np.minimum(np.maximum(qx, qy), 0)


def U(*fs):
    return np.minimum.reduce(fs)


def cut(f, *holes):
    return np.maximum.reduce([f] + [-h for h in holes])


def smooth(F, sigma):
    """Blur a field: straight edges stay put, corners of either kind round off by about sigma."""
    r = max(1, int(round(sigma / GRID)))
    for _ in range(3):                      # three box passes: near enough a gaussian
        for axis in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (r + 1, r)
            c = np.cumsum(np.pad(F, pad, mode='edge'), axis=axis)
            F = (c[2 * r + 1:] - c[:-2 * r - 1]) if axis == 0 else (c[:, 2 * r + 1:] - c[:, :-2 * r - 1])
            F = F / (2 * r + 1)
    return F


def fillet(pts, convex, concave=None, step=0.2):
    """A closed polygon with its corners replaced by arcs: radius `convex` on the points,
    `concave` in the notches (less where the edges are too short to take it)."""
    P = [np.array(q, dtype=float) for q in pts]
    n = len(P)
    ccw = sum(P[k][0] * P[(k + 1) % n][1] - P[(k + 1) % n][0] * P[k][1] for k in range(n)) > 0
    out = []
    for k in range(n):
        a, v, b = P[k - 1], P[k], P[(k + 1) % n]
        turn = (v - a)[0] * (b - v)[1] - (v - a)[1] * (b - v)[0]
        r = convex if (turn > 0) == ccw or concave is None else concave
        e1, e2 = a - v, b - v
        L1, L2 = np.linalg.norm(e1), np.linalg.norm(e2)
        e1, e2 = e1 / L1, e2 / L2
        phi = math.acos(max(-1.0, min(1.0, float(e1 @ e2))))
        if phi > math.pi - 1e-6:
            out.append(tuple(v))
            continue
        t = r / math.tan(phi / 2)
        rr = r
        if t > 0.45 * min(L1, L2):
            t = 0.45 * min(L1, L2)
            rr = t * math.tan(phi / 2)
        p1, p2 = v + e1 * t, v + e2 * t
        bis = (e1 + e2) / np.linalg.norm(e1 + e2)
        c = v + bis * rr / math.sin(phi / 2)
        a1 = math.atan2(*(p1 - c)[::-1])
        a2 = math.atan2(*(p2 - c)[::-1])
        da = (a2 - a1 + math.pi) % (2 * math.pi) - math.pi
        m = max(2, math.ceil(abs(da) * rr / step))
        out += [(c[0] + rr * math.cos(a1 + da * i / m), c[1] + rr * math.sin(a1 + da * i / m)) for i in range(m + 1)]
    return out


def smin(a, b, k):
    h = np.maximum(k - np.abs(a - b), 0) / k
    return np.minimum(a, b) - h * h * k * 0.25


def stroke_parts(pts, w):
    """The canvas stroke of a closed path, as convex pieces: a bar per edge
    and a miter (or bevel past the limit) on the outside of every turn."""
    n = len(pts)
    p = [np.array(q, dtype=float) for q in pts]
    hw = w / 2
    bars = [(tuple(p[k]), tuple(p[(k + 1) % n])) for k in range(n)]
    joins = []
    for k in range(n):
        a, v, b = p[k - 1], p[k], p[(k + 1) % n]
        e1, e2 = (v - a) / np.linalg.norm(v - a), (b - v) / np.linalg.norm(b - v)
        turn = e1[0] * e2[1] - e1[1] * e2[0]
        if abs(turn) < 1e-9:
            continue
        # the outside of the turn is to the right of a left turn, and to the left of a right one
        side = -1 if turn > 0 else 1
        n1 = side * np.array([-e1[1], e1[0]])
        n2 = side * np.array([-e2[1], e2[0]])
        cos_half = math.sqrt(max((1 + float(n1 @ n2)) / 2, 1e-12))
        ratio = 1 / cos_half              # miter length over half the width
        if ratio <= MITER_LIMIT:
            m = v + (n1 + n2) / np.linalg.norm(n1 + n2) * hw * ratio
            joins.append([tuple(v), tuple(v + n1 * hw), tuple(m), tuple(v + n2 * hw)])
        else:
            joins.append([tuple(v), tuple(v + n1 * hw), tuple(v + n2 * hw)])
    return bars, joins


def ngon_ellipse(cx, cy, rx, ry, n=96):
    return [(cx + rx * math.cos(2 * math.pi * k / n), cy + ry * math.sin(2 * math.pi * k / n)) for k in range(n)]


# ------------------------------------------------------ outlines from fields
def trace(field, F):
    """Marching squares at F = 0: closed loops, interior on the left."""
    inside = F < 0
    ny, nx = F.shape
    if inside[0].any() or inside[-1].any() or inside[:, 0].any() or inside[:, -1].any():
        raise RuntimeError('a region touches the edge of the grid')
    x0, y0 = field.xs[0], field.ys[0]
    nH = ny * (nx - 1)

    def H(i, j):
        return i * (nx - 1) + j

    def V(i, j):
        return nH + i * nx + j

    c0 = inside[:-1, :-1]
    c1 = inside[:-1, 1:]
    c2 = inside[1:, 1:]
    c3 = inside[1:, :-1]
    case = c0 * 1 + c1 * 2 + c2 * 4 + c3 * 8
    centre = (F[:-1, :-1] + F[:-1, 1:] + F[1:, 1:] + F[1:, :-1]) < 0
    I, J = np.indices(case.shape)
    e = {0: lambda i, j: H(i, j), 1: lambda i, j: V(i, j + 1), 2: lambda i, j: H(i + 1, j), 3: lambda i, j: V(i, j)}
    table = {1: [(3, 0)], 2: [(0, 1)], 3: [(3, 1)], 4: [(1, 2)], 6: [(0, 2)], 7: [(3, 2)],
             8: [(2, 3)], 9: [(0, 2)], 11: [(1, 2)], 12: [(1, 3)], 13: [(0, 1)], 14: [(3, 0)]}
    segs = []
    for c, pairs in table.items():
        m = case == c
        for ea, eb in pairs:
            segs.append(np.stack([e[ea](I[m], J[m]), e[eb](I[m], J[m])], 1))
    for c, joined, apart in ((5, [(0, 1), (2, 3)], [(3, 0), (1, 2)]), (10, [(3, 0), (1, 2)], [(0, 1), (2, 3)])):
        for want, pairs in ((True, joined), (False, apart)):
            m = (case == c) & (centre == want)
            for ea, eb in pairs:
                segs.append(np.stack([e[ea](I[m], J[m]), e[eb](I[m], J[m])], 1))
    segs = np.concatenate(segs)
    if not len(segs):
        return []

    ids = np.unique(segs)
    pos = {}
    h = ids[ids < nH]
    i, j = h // (nx - 1), h % (nx - 1)
    t = F[i, j] / (F[i, j] - F[i, j + 1])
    for k, x, y in zip(h, x0 + (j + t) * GRID, y0 + i * GRID):
        pos[int(k)] = (float(x), float(y))
    v = ids[ids >= nH] - nH
    i, j = v // nx, v % nx
    t = F[i, j] / (F[i, j] - F[i + 1, j])
    for k, x, y in zip(v + nH, x0 + j * GRID, y0 + (i + t) * GRID):
        pos[int(k)] = (float(x), float(y))

    nbr = {}
    for a, b in segs.tolist():
        nbr.setdefault(a, []).append(b)
        nbr.setdefault(b, []).append(a)
    seen = set()
    loops = []
    for start in nbr:
        if start in seen:
            continue
        loop = [start]
        seen.add(start)
        prev, cur = None, start
        while True:
            a, b = nbr[cur]
            nxt = b if a == prev else a
            if nxt == start:
                break
            loop.append(nxt)
            seen.add(nxt)
            prev, cur = cur, nxt
        loops.append(np.array([pos[k] for k in loop]))
    return loops


def rdp(pts, tol):
    keep = np.zeros(len(pts), dtype=bool)
    keep[0] = keep[-1] = True
    stack = [(0, len(pts) - 1)]
    while stack:
        a, b = stack.pop()
        if b <= a + 1:
            continue
        p, q = pts[a], pts[b]
        seg = q - p
        L = math.hypot(*seg)
        r = pts[a + 1:b] - p
        d = np.abs(r[:, 0] * seg[1] - r[:, 1] * seg[0]) / L if L > 0 else np.hypot(r[:, 0], r[:, 1])
        k = int(np.argmax(d))
        if d[k] > tol:
            m = a + 1 + k
            keep[m] = True
            stack += [(a, m), (m, b)]
    return pts[keep]


def simplify(loop, tol):
    far = int(np.argmax(np.hypot(*(loop - loop[0]).T)))
    a = rdp(np.vstack([loop[:far + 1]]), tol)
    b = rdp(np.vstack([loop[far:], loop[:1]]), tol)
    return np.vstack([a[:-1], b[:-1]])


def area(loop):
    x, y = loop[:, 0], loop[:, 1]
    return 0.5 * float(np.sum(x * np.roll(y, -1) - np.roll(x, -1) * y))


def contains(loop, pt):
    x, y = pt
    xs, ys = loop[:, 0], loop[:, 1]
    xn, yn = np.roll(xs, -1), np.roll(ys, -1)
    m = (ys > y) != (yn > y)
    with np.errstate(divide='ignore', invalid='ignore'):
        xi = (xn - xs) * (y - ys) / (yn - ys) + xs
    return int(np.sum(m & (x < xi))) % 2 == 1


def tidy(lp):
    """Drop repeated points and points exactly in line with their neighbours. After snapping,
    that is also what removes a spike: a run that goes up a line and straight back down it."""
    pts = [tuple(p) for p in lp]
    i = 0
    while len(pts) >= 3 and i < len(pts):
        a, b, c = pts[i - 1], pts[i], pts[(i + 1) % len(pts)]
        if (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]) == 0:
            del pts[i]
            i = max(i - 1, 0)
        else:
            i += 1
    return np.array(pts).reshape(-1, 2)


def outline(field, F, tol=TOL, min_area=0.02):
    """The region F < 0 as loops, simplified, outer boundaries CCW and holes CW."""
    # snapped, so an edge that is straight up and down in the field is exactly so here: float noise
    # in x would otherwise open slabs a hair wide in prism() and fill them with zero-area triangles
    loops = [tidy(np.round(simplify(lp, tol), 5)) for lp in trace(field, F)]
    loops = [lp for lp in loops if len(lp) >= 3 and abs(area(lp)) >= min_area]
    out = []
    for k, lp in enumerate(loops):
        depth = sum(contains(o, lp[0]) for m, o in enumerate(loops) if m != k)
        want_ccw = depth % 2 == 0
        if (area(lp) > 0) != want_ccw:
            lp = lp[::-1]
        out.append(lp)
    return out


# ---------------------------------------------------------------- meshes
class Shell:
    """One closed solid: vertices and triangles, outward-facing (CCW from outside)."""

    def __init__(self):
        self.v = []
        self.f = []
        self.index = {}
        self.smooth = []   # per triangle: does it belong to a curved surface

    def vert(self, p):
        k = (p[0], p[1], p[2])
        i = self.index.get(k)
        if i is None:
            i = self.index[k] = len(self.v)
            self.v.append(k)
        return i

    def tri(self, a, b, c, smooth=False):
        ia, ib, ic = self.vert(a), self.vert(b), self.vert(c)
        if ia != ib and ib != ic and ia != ic:
            self.f.append((ia, ib, ic))
            self.smooth.append(smooth)


def prism(loops, z0, z1):
    """Extrude a region (loops from outline(), game units) between z0 and z1 mm, as one closed shell.
    Caps come from a vertical slab sweep; every point a cap puts on a slab line
    is also put on its neighbours' and on the walls, so nothing is left hanging."""
    sh = Shell()
    if not loops:
        return sh
    edges = []
    for lp in loops:
        n = len(lp)
        for k in range(n):
            p, q = tuple(lp[k]), tuple(lp[(k + 1) % n])
            if p != q:
                edges.append((p, q))
    xs = sorted({p[0] for p, _ in edges})
    kx = {x: k for k, x in enumerate(xs)}
    ycache = {}

    def y_at(e, k):
        key = (e, k)
        if key not in ycache:
            (px, py), (qx, qy) = edges[e]
            X = xs[k]
            if X == px:
                y = py
            elif X == qx:
                y = qy
            else:
                y = py + (qy - py) * (X - px) / (qx - px)
            ycache[key] = y
        return ycache[key]

    slabs = [[] for _ in range(len(xs) - 1)]
    for e, ((px, _), (qx, _)) in enumerate(edges):
        if px == qx:
            continue
        a, b = sorted((kx[px], kx[qx]))
        for k in range(a, b):
            slabs[k].append(e)

    traps = []
    onx = [set() for _ in xs]
    for k, act in enumerate(slabs):
        if not act:
            continue
        rows = sorted(act, key=lambda e: y_at(e, k) + y_at(e, k + 1))
        if len(rows) % 2:
            raise RuntimeError('odd crossing count in a slab')
        for m in range(0, len(rows), 2):
            lo, hi = rows[m], rows[m + 1]
            t = (k, y_at(lo, k), y_at(lo, k + 1), y_at(hi, k + 1), y_at(hi, k))
            traps.append(t)
            onx[k].update((t[1], t[4]))
            onx[k + 1].update((t[2], t[3]))
    onx = [np.array(sorted(s)) for s in onx]

    def between(k, ya, yb):
        s = onx[k]
        i0 = np.searchsorted(s, ya, side='right')
        i1 = np.searchsorted(s, yb, side='left')
        return s[i0:i1].tolist()

    for k, ya0, ya1, yb1, yb0 in traps:
        x0, x1 = xs[k], xs[k + 1]
        ring = [(x0, ya0), (x1, ya1)]
        ring += [(x1, y) for y in between(k + 1, ya1, yb1)]
        ring += [(x1, yb1), (x0, yb0)]
        ring += [(x0, y) for y in reversed(between(k, ya0, yb0))]
        clean = [ring[0]]
        for p in ring[1:]:
            if p != clean[-1]:
                clean.append(p)
        if clean[-1] == clean[0]:
            clean.pop()
        if len(clean) < 3:
            continue
        cx = sum(p[0] for p in clean) / len(clean)
        cy = sum(p[1] for p in clean) / len(clean)
        for a, b in zip(clean, clean[1:] + clean[:1]):
            sh.tri((cx, cy, z1), (a[0], a[1], z1), (b[0], b[1], z1))
            sh.tri((cx, cy, z0), (b[0], b[1], z0), (a[0], a[1], z0))

    eid = 0
    for lp in loops:
        n = len(lp)
        for k in range(n):
            p, q = tuple(lp[k]), tuple(lp[(k + 1) % n])
            if p == q:
                continue
            e = eid
            eid += 1
            if p[0] == q[0]:
                k0 = kx[p[0]]
                mids = between(k0, *sorted((p[1], q[1])))
                if q[1] < p[1]:
                    mids = mids[::-1]
                run = [p] + [(p[0], y) for y in mids] + [q]
            else:
                a, b = kx[p[0]], kx[q[0]]
                step = 1 if b > a else -1
                run = [p] + [(xs[j], y_at(e, j)) for j in range(a + step, b, step)] + [q]
            for (ax, ay), (bx, by) in zip(run, run[1:]):
                sh.tri((ax, ay, z0), (bx, by, z0), (bx, by, z1))
                sh.tri((ax, ay, z0), (bx, by, z1), (ax, ay, z1))
    return sh


def dome(ring, z0, z1, top):
    """A plug with an elliptical blister: walls z0..z1 on ring, then a dome rising
    to `top` (mm) over the same ring. ring is the n-gon used in the fields."""
    sh = Shell()
    cx = sum(p[0] for p in ring) / len(ring)
    cy = sum(p[1] for p in ring) / len(ring)
    n = len(ring)
    for k in range(n):
        a, b = ring[k], ring[(k + 1) % n]
        sh.tri((cx, cy, z0), (b[0], b[1], z0), (a[0], a[1], z0))
        sh.tri((a[0], a[1], z0), (b[0], b[1], z0), (b[0], b[1], z1))
        sh.tri((a[0], a[1], z0), (b[0], b[1], z1), (a[0], a[1], z1))
    rings = 14
    prev = [(p[0], p[1], z1) for p in ring]
    for r in range(1, rings):
        phi = (math.pi / 2) * r / rings
        c, s = math.cos(phi), math.sin(phi)
        cur = [(cx + (p[0] - cx) * c, cy + (p[1] - cy) * c, z1 + (top - z1) * s) for p in ring]
        for k in range(n):
            a, b = prev[k], prev[(k + 1) % n]
            c2, d = cur[k], cur[(k + 1) % n]
            sh.tri(a, b, d, True)
            sh.tri(a, d, c2, True)
        prev = cur
    apex = (cx, cy, top)
    for k in range(n):
        sh.tri(prev[k], prev[(k + 1) % n], apex, True)
    return sh


def transform(sh, fn):
    """Move a shell's vertices through fn((x, y, z)) -> (x, y, z). fn must keep handedness."""
    out = Shell()
    out.v = [fn(p) for p in sh.v]
    out.f = list(sh.f)
    out.smooth = list(sh.smooth)
    return out


def closed(sh):
    """Every edge is shared by exactly two triangles, running opposite ways."""
    seen = {}
    for a, b, c in sh.f:
        for e in ((a, b), (b, c), (c, a)):
            seen[e] = seen.get(e, 0) + 1
    return all(n == 1 and seen.get((e[1], e[0])) == 1 for e, n in seen.items())


def volume(sh):
    v = np.array(sh.v)
    f = np.array(sh.f)
    a, b, c = v[f[:, 0]], v[f[:, 1]], v[f[:, 2]]
    return float(np.sum(np.einsum('ij,ij->i', a, np.cross(b, c)))) / 6


# ------------------------------------------------------- keychain and mini
def build(pilot, vname):
    """One ship made one way. Returns its parts ({part: [(element, shell)]}, millimetres)
    and what else the pieces around it need: its size, and the hole or the socket."""
    spec, V = PILOTS[pilot], VARIANTS[vname]
    S, Z, R, L = V['S'], V['z'], V['round'], V['loop']
    hull = hull_points(pilot)
    path = fillet(hull, R['convex'], R['concave']) if R else hull
    bars, joins = stroke_parts(hull, RIM_W)
    flame_pts = [fillet(t, R['flame']) if R else t for t in spec['flames']]

    # how far the ship reaches: the miter at the nose, or the rounded nose and its rim
    nose = max(p[0] for p in path) + RIM_W / 2 if R else max(max(p[0] for p in j) for j in joins)
    reach = max(abs(p[1]) for j in joins for p in j)
    tail = min(min(p[0] for p in fl) for fl in flame_pts)
    margin = V['glow'] + (3 * R['blur'] if R else 0) + 2
    if L:
        hole_r, loop_r, ring_w = L['hole'] / S, L['outer'] / S, L['ring'] / S
        loop_cx = nose + V['glow'] + loop_r - 2.2
        front = loop_cx + loop_r
    else:
        front = nose
    fld = Field(tail - V['flame_glow'] - margin, front + margin, -reach - margin, reach + margin)
    far = np.full(fld.X.shape, 1e3)

    inside = fld.polygon(path)
    if R:   # round joins all the way round: a band either side of the rounded path
        stroke = np.abs(inside) - RIM_W / 2
    else:   # the canvas stroke: bars with miters
        stroke = U(*[fld.bar(a, b, RIM_W) for a, b in bars], *[fld.polygon(j) for j in joins])
    thin = R['line_mm'] / S if R else 0

    def seg(a, b, w):
        return fld.capsule(a, b, max(w, thin)) if R else fld.bar(a, b, w)

    grooves = U(*[seg(a, b, w) for (a, b), w in spec['grooves']],
                *[fld.rect(*r, r=0.45 * min(r[2], r[3]) if R else 0.0) for r in spec['rects']])
    lines = U(*[seg(a, b, w) for (a, b), w in spec['lines']])
    hot = U(*[seg(a, b, w) for (a, b), w in spec['hot']]) if spec['hot'] else far
    cx, cy, rx, ry = spec['canopy']
    canopy_ring = ngon_ellipse(cx, cy, rx, ry)
    canopy = fld.polygon_near(canopy_ring)
    flames = U(*[fld.polygon(t) for t in flame_pts])

    foot = U(inside, stroke)
    body = cut(inside, stroke)
    halo = smin(foot - V['glow'], flames - V['flame_glow'], 1.5)
    if L:
        halo = smin(halo, fld.circle(loop_cx, 0, loop_r), 3.0)
    if R:
        halo = smooth(halo, R['blur'])
        grooves = np.maximum(grooves, body)      # the rim stays one unbroken loop
    if L:
        halo = cut(halo, fld.circle(loop_cx, 0, hole_r))
    hot_in = np.maximum(hot, body)               # seams only where there is hull under them
    lit = cut(np.maximum(lines, foot), canopy)   # lines only where there is ship under them

    layers = {
        'halo': [(halo, 0, Z['halo'])],
        'hull': [(body, Z['halo'], Z['floor']),
                 (cut(body, grooves, hot_in, lit, canopy), Z['floor'], Z['body'])],
        'neon': [(stroke, Z['halo'], Z['floor']),
                 (cut(U(cut(stroke, grooves), lit), canopy, hot_in), Z['floor'], Z['line']),
                 (cut(stroke, grooves), Z['line'], Z['rim'])],
        'hot': [(hot_in, Z['floor'], Z['line'])] if spec['hot'] else [],
        'light': [(cut(flames, foot), Z['halo'], Z['flame'])],
    }
    if L:
        layers['neon'].append((cut(fld.circle(loop_cx, 0, hole_r + ring_w), fld.circle(loop_cx, 0, hole_r)),
                               Z['halo'], Z['ring']))

    sx = sy = 0.0
    if V['socket']:
        # a blind hole up into the back, at the middle of the whole outline, roofed by the hull
        sx = float(fld.X[halo < 0].mean())
        depth = V['socket']['depth']
        sock = fld.circle(sx, sy, V['socket']['r'] / S)
        for name, stack in layers.items():
            out = []
            for F, z0, z1 in stack:
                if z0 >= depth or not ((F < 0) & (sock < 0)).any():
                    out.append((F, z0, z1))
                    continue
                out.append((cut(F, sock), z0, min(z1, depth)))
                if z1 > depth:
                    out.append((F, depth, z1))
            layers[name] = out

    def place(sh):
        # game x (the nose) points up the model: a quarter turn, so the triangles keep their winding
        return transform(sh, lambda p: (-p[1] * S, p[0] * S, p[2]))

    parts = {}
    for name, stack in layers.items():
        for F, z0, z1 in stack:
            sh = prism(outline(fld, F, V['tol'] / S), z0, z1)
            if sh.f:
                parts.setdefault(name, []).append(('flame' if name == 'light' else name, place(sh)))
    parts['light'].append(('canopy', place(dome(canopy_ring, Z['floor'], Z['body'], Z['body'] + V['dome']))))

    # the origin: the socket on a mini (where the peg goes), the middle of the face on a keychain
    allv = np.concatenate([np.array(s.v) for v in parts.values() for _, s in v])
    lo, hi = allv.min(0), allv.max(0)
    ox, oy = (-sy * S, sx * S) if V['socket'] else ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2)
    parts = {k: [(el, transform(s, lambda p: (p[0] - ox, p[1] - oy, p[2]))) for el, s in v]
             for k, v in parts.items()}
    info = dict(size=[round(float(x), 1) for x in hi - lo],
                extent=[round(float(lo[0] - ox), 2), round(float(lo[1] - oy), 2),
                        round(float(hi[0] - ox), 2), round(float(hi[1] - oy), 2)])
    if L:
        info['hole'] = [round(-ox, 2) + 0.0, round(loop_cx * S - oy, 2) + 0.0, L['hole']]
    if V['socket']:
        info['socket'] = [0.0, 0.0, V['socket']['r'], V['socket']['depth']]
    return parts, info


def build_stand():
    """The mini's stand: a disc with the arena's grid cut in, a post, and the peg the ship sits on."""
    T = STAND
    fld = Field(-T['r'] - 2, T['r'] + 2, -T['r'] - 2, T['r'] + 2)    # millimetres, here
    n = int(T['r'] // T['grid']) + 1
    grid = U(*[fld.bar((k * T['grid'], -T['r'] - 1), (k * T['grid'], T['r'] + 1), T['line']) for k in range(-n, n + 1)],
             *[fld.bar((-T['r'] - 1, k * T['grid']), (T['r'] + 1, k * T['grid']), T['line']) for k in range(-n, n + 1)])
    post = fld.circle(0, 0, T['post_r'])
    z1 = T['base'] + T['top']
    z2 = z1 + T['post_h']
    shells = [prism(outline(fld, fld.circle(0, 0, T['r'])), 0, T['base']),
              prism(outline(fld, cut(fld.circle(0, 0, T['r'] - T['top']), cut(grid, post))), T['base'], z1),
              prism(outline(fld, post), z1, z2),
              prism(outline(fld, fld.circle(0, 0, T['peg_r'])), z2, z2 + T['peg_h'])]
    return [('stand', s) for s in shells], dict(size=[2 * T['r'], 2 * T['r'], z2 + T['peg_h']], rest=z2)


# ----------------------------------------------------------------- colours
def palette(pilot):
    spec = PILOTS[pilot]
    col = spec['col']
    pal = {
        'halo': dict(label=f'translucent {spec["filament"]}', color=col, alpha=0.55, emissive=0.35),
        'hull': dict(label='black', color=mix(col, VOID, 0.18), alpha=1, emissive=0.0),
        'neon': dict(label=spec['filament'], color=col, alpha=1, emissive=1.6),
        'light': dict(label='white', color='#f1f7fb', alpha=1, emissive=1.4),
    }
    if spec['hot']:
        pal['hot'] = dict(label='orange', color='#fb923c', alpha=1, emissive=1.4)
    return pal


STAND_PAL = dict(label='black, or any', color='#1b2233', alpha=1, emissive=0.0)


# ------------------------------------------------------------------ files
def write_stl(path, shells):
    tris = []
    for _, s in shells:
        v = np.array(s.v, dtype=np.float64)
        for a, b, c in s.f:
            tris.append((v[a], v[b], v[c]))
    with open(path, 'wb') as fh:
        fh.write(b'VOIDRUNNER keychain'.ljust(80, b' '))
        fh.write(struct.pack('<I', len(tris)))
        for a, b, c in tris:
            n = np.cross(b - a, c - a)
            L = np.linalg.norm(n)
            n = n / L if L else n
            fh.write(struct.pack('<12fH', *n, *a, *b, *c, 0))


def write_3mf(path, items):
    """items: [(name, [(part, colour, shells)], (x, y))]. Each item is placed on the plate at
    (x, y); one with several parts is an object made of them, so a slicer keeps them together."""
    mats, objs, build = [], [], []
    oid = 2
    for name, parts, (tx, ty) in items:
        ids = []
        for part, colour, shells in parts:
            vs, ts = [], []
            base = 0
            for _, s in shells:
                vs += [f'<vertex x="{x:.4f}" y="{y:.4f}" z="{z:.4f}"/>' for x, y, z in s.v]
                ts += [f'<triangle v1="{a + base}" v2="{b + base}" v3="{c + base}"/>' for a, b, c in s.f]
                base += len(s.v)
            mats.append(f'<base name="{name} {part}" displaycolor="{colour.upper()}FF"/>')
            objs.append(f'<object id="{oid}" name="{part}" type="model" pid="1" pindex="{len(mats) - 1}"><mesh>'
                        f'<vertices>{"".join(vs)}</vertices><triangles>{"".join(ts)}</triangles></mesh></object>')
            ids.append(oid)
            oid += 1
        if len(ids) > 1:
            comps = ''.join(f'<component objectid="{i}"/>' for i in ids)
            objs.append(f'<object id="{oid}" name="{name}" type="model"><components>{comps}</components></object>')
            top, oid = oid, oid + 1
        else:
            top = ids[0]
        build.append(f'<item objectid="{top}" transform="1 0 0 0 1 0 0 0 1 {tx:.3f} {ty:.3f} 0"/>')
    model = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<model unit="millimeter" xml:lang="en-US" xmlns="http://schemas.microsoft.com/3dmanufacturing/core/2015/02">'
             f'<metadata name="Title">{items[0][0]}</metadata>'
             '<metadata name="Designer">VOIDRUNNER</metadata>'
             f'<resources><basematerials id="1">{"".join(mats)}</basematerials>{"".join(objs)}'
             f'</resources><build>{"".join(build)}</build></model>')
    types = ('<?xml version="1.0" encoding="UTF-8"?>\n'
             '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
             '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
             '<Default Extension="model" ContentType="application/vnd.ms-package.3dmanufacturing-3dmodel+xml"/></Types>')
    rels = ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Target="/3D/3dmodel.model" Id="rel0" '
            'Type="http://schemas.microsoft.com/3dmanufacturing/2013/01/3dmodel"/></Relationships>')
    with zipfile.ZipFile(path, 'w', zipfile.ZIP_DEFLATED) as z:
        z.writestr('[Content_Types].xml', types)
        z.writestr('_rels/.rels', rels)
        z.writestr('3D/3dmodel.model', model)


def glb_groups(pilot, parts, lift=0.0):
    """One mesh per part, the light split into canopy and flame for their own colours."""
    pal, spec = palette(pilot), PILOTS[pilot]
    groups = []
    for name, shells in parts.items():
        for el in dict.fromkeys(e for e, _ in shells):
            m = dict(pal[name], color=spec['light'][el]) if name == 'light' else pal[name]
            groups.append((el, [transform(s, lambda p: (p[0], p[1], p[2] + lift)) if lift else s
                                for e, s in shells if e == el], m))
    return groups


# millimetres to metres, and which way is up in glTF (y): a keychain hangs nose to the sky facing +z;
# a mini lies flat, its back down, nose away from the viewer
GLB_HANG = [0.001, 0, 0, 0, 0, 0.001, 0, 0, 0, 0, 0.001, 0, 0, 0, 0, 1]
GLB_FLAT = [0.001, 0, 0, 0, 0, 0, -0.001, 0, 0, 0.001, 0, 0, 0, 0, 0, 1]


def write_glb(path, title, groups, matrix):
    """For looking at, not printing: flat-shaded except the blisters, with the
    glow the game gives each part as emissive."""
    bin_ = bytearray()
    views, accessors, meshes, nodes, materials = [], [], [], [], []

    def add(arr, target, comp, typ, minmax=False):
        data = arr.tobytes()
        while len(bin_) % 4:
            bin_.append(0)
        views.append(dict(buffer=0, byteOffset=len(bin_), byteLength=len(data), target=target))
        bin_.extend(data)
        acc = dict(bufferView=len(views) - 1, componentType=comp, count=int(arr.shape[0]), type=typ)
        if minmax:
            acc['min'] = arr.min(0).tolist()
            acc['max'] = arr.max(0).tolist()
        accessors.append(acc)
        return len(accessors) - 1

    def srgb_to_linear(c):
        c = c / 255
        return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4

    for name, shells, m in groups:
        P, N, I = [], [], []
        for s in shells:
            v = np.array(s.v, dtype=np.float64)
            f = np.array(s.f, dtype=np.int64)
            sm = np.array(s.smooth, dtype=bool)
            fn = np.cross(v[f[:, 1]] - v[f[:, 0]], v[f[:, 2]] - v[f[:, 0]])
            fn /= np.linalg.norm(fn, axis=1, keepdims=True)
            flat = f[~sm]
            base = sum(len(p) for p in P)
            fp = v[flat].reshape(-1, 3)
            P.append(fp)
            N.append(np.repeat(fn[~sm], 3, axis=0))
            I.append(np.arange(len(fp)) + base)
            if sm.any():
                sf = f[sm]
                used = np.unique(sf)
                remap = {int(o): i for i, o in enumerate(used)}
                vn = np.zeros((len(used), 3))
                area_n = np.cross(v[sf[:, 1]] - v[sf[:, 0]], v[sf[:, 2]] - v[sf[:, 0]])
                for k in range(3):
                    np.add.at(vn, np.vectorize(remap.get)(sf[:, k]), area_n)
                vn /= np.linalg.norm(vn, axis=1, keepdims=True)
                base = sum(len(p) for p in P)
                P.append(v[used])
                N.append(vn)
                I.append(np.vectorize(remap.get)(sf).reshape(-1) + base)
        P = np.concatenate(P).astype(np.float32)
        N = np.concatenate(N).astype(np.float32)
        I = np.concatenate(I).astype(np.uint32)
        pa = add(P, 34962, 5126, 'VEC3', True)
        na = add(N, 34962, 5126, 'VEC3')
        ia = add(I, 34963, 5125, 'SCALAR')
        rgb = [srgb_to_linear(int(m['color'][k:k + 2], 16)) for k in (1, 3, 5)]
        mat = dict(name=name, pbrMetallicRoughness=dict(baseColorFactor=rgb + [m['alpha']], metallicFactor=0.0,
                                                         roughnessFactor=0.6 if name in ('hull', 'stand') else 0.35),
                   emissiveFactor=rgb if m['emissive'] else [0, 0, 0])
        if m['emissive'] > 1:
            mat['extensions'] = {'KHR_materials_emissive_strength': {'emissiveStrength': m['emissive']}}
        elif m['emissive']:
            mat['emissiveFactor'] = [c * m['emissive'] for c in rgb]
        if m['alpha'] < 1:
            mat['alphaMode'] = 'BLEND'
            mat['doubleSided'] = True
        materials.append(mat)
        meshes.append(dict(name=name, primitives=[dict(attributes=dict(POSITION=pa, NORMAL=na), indices=ia,
                                                        material=len(materials) - 1)]))
        nodes.append(dict(name=name, mesh=len(meshes) - 1))

    root = dict(name=title, children=list(range(len(nodes))), matrix=matrix)
    nodes.append(root)
    while len(bin_) % 4:
        bin_.append(0)
    gltf = dict(asset=dict(version='2.0', generator='VOIDRUNNER keychains/build.py'),
                extensionsUsed=['KHR_materials_emissive_strength'],
                scene=0, scenes=[dict(nodes=[len(nodes) - 1])], nodes=nodes, meshes=meshes,
                materials=materials, accessors=accessors, bufferViews=views,
                buffers=[dict(byteLength=len(bin_))])
    js = json.dumps(gltf, separators=(',', ':')).encode()
    while len(js) % 4:
        js += b' '
    with open(path, 'wb') as fh:
        fh.write(struct.pack('<III', 0x46546C67, 2, 12 + 8 + len(js) + 8 + len(bin_)))
        fh.write(struct.pack('<II', len(js), 0x4E4F534A))
        fh.write(js)
        fh.write(struct.pack('<II', len(bin_), 0x004E4942))
        fh.write(bin_)


# ------------------------------------------------------------------- main
def solid(label, parts):
    for part, shells in parts.items():
        for k, (_, s) in enumerate(shells):
            if not closed(s):
                sys.exit(f'{label} {part} shell {k} is not closed')
            if volume(s) <= 0:
                sys.exit(f'{label} {part} shell {k} faces inward')
    return sum(len(s.f) for v in parts.values() for _, s in v)


def main():
    check = '--check' in sys.argv
    report = []
    stand, stand_info = build_stand()
    n = solid('stand', {'stand': stand})
    report.append(f'{"stand":<17} {stand_info["size"][0]:5.1f} x {stand_info["size"][1]:5.1f} x {stand_info["size"][2]:5.2f} mm  {n:6d} triangles')
    meta = {'stand': dict(stand_info, triangles=n, filament=STAND_PAL['label'], color=STAND_PAL['color'])}
    if not check:
        (OUT / 'stl').mkdir(parents=True, exist_ok=True)
        write_stl(OUT / 'mini-stand.stl', stand)
    for pilot in ('runner', 'ember'):
        name, slug = PILOTS[pilot]['name'], 'voidrunner' if pilot == 'runner' else 'ember'
        pal = palette(pilot)
        meta[slug] = dict(name=name, col=PILOTS[pilot]['col'])
        for vname in VARIANTS:
            parts, info = build(pilot, vname)
            tris = solid(f'{name} {vname}', parts)
            size = info['size']
            report.append(f'{name + " " + vname:<17} {size[0]:5.1f} x {size[1]:5.1f} x {size[2]:5.2f} mm  '
                          f'{tris:6d} triangles  parts: {", ".join(parts)}')
            zs = {k: [min(p[2] for _, s in v for p in s.v), max(p[2] for _, s in v for p in s.v)] for k, v in parts.items()}
            meta[slug][vname] = dict(info, triangles=tris, parts=[
                dict(id=k, filament=pal[k]['label'], color=pal[k]['color'], z=[round(z, 1) for z in zs[k]]) for k in parts])
            if check:
                continue
            stem = f'{slug}-{vname}'
            coloured = [(k, pal[k]['color'], v) for k, v in parts.items()]
            if vname == 'mini':
                # the stand goes on the plate beside the ship
                beside = (size[0] / 2 + STAND['r'] + 6, 0)
                write_3mf(OUT / f'{stem}.3mf', [(f'{name} mini', coloured, (0, 0)),
                                                ('mini stand', [('stand', STAND_PAL['color'], stand)], beside)])
                groups = glb_groups(pilot, parts, lift=stand_info['rest']) + [('stand', [s for _, s in stand], STAND_PAL)]
                write_glb(OUT / f'{stem}.glb', f'{name} mini', groups, GLB_FLAT)
            else:
                write_3mf(OUT / f'{stem}.3mf', [(f'{name} keychain', coloured, (0, 0))])
                write_glb(OUT / f'{stem}.glb', f'{name} keychain', glb_groups(pilot, parts), GLB_HANG)
            write_stl(OUT / f'{stem}.stl', [x for v in parts.values() for x in v])
            for part, shells in parts.items():
                write_stl(OUT / 'stl' / f'{stem}-{part}.stl', shells)
    print('\n'.join(report))
    if not check:
        (OUT / 'keychains.json').write_text(json.dumps(meta, indent=1) + '\n')
        print(f'written to {OUT.relative_to(ROOT)}/')


if __name__ == '__main__':
    main()
