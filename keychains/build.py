#!/usr/bin/env python3
"""VOIDRUNNER keychains and minis: the base VOIDRUNNER and EMBER as printable 3D models.

    python3 keychains/build.py            writes keychains/out/
    python3 keychains/build.py --check    builds everything, checks every shell is closed, writes nothing

The ships are sculpted, the way a real craft would be built: a fuselage with an
oval section running nose to tail, wings that thin to a rounded edge, engine
pods, a glass canopy blister, panel lines engraved, and the exhaust as plumes.
What makes them the arena's ships comes from the game itself. The outline is
read straight out of hullPath() in index.html, offset by half the 2.4 stroke so
it is the size the arena draws it, and the furniture is hullDetail()'s, line for
line, in the game's colours:

    hull   the body, in the dark tint the game fills it with; the dark lines engraved
    neon   the stroke round the silhouette as trim along every edge, and the lit
           lines as raised strips (EMBER's rail becomes a railgun's two rails)
    hot    EMBER only: the vane seams that glow when the lance is charged
    light  the canopy and the exhaust

Each colour is an inlay a few tenths of a millimetre deep that follows the
surface, so a multi-colour printer changes filament only near the top. Every
part is a closed solid and no two overlap. The underside is flat, so both print
face up with no supports.

Each ship is made two ways (VARIANTS): a keychain hanging nose-up from a tab past
the nose, and a mini, smaller and a little deeper in relief, with a socket in its
belly for a stand of arena floor (STAND).

Only numpy. Regions and heights are fields on a grid; each part is a slab
between two height fields over a region, meshed cell by cell with marching
squares, so the surfaces follow the fields and every slab is closed.
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

GRID = 0.03    # field step for the stand, in millimetres
TOL = 0.008    # how far a simplified outline may stray

RIM_W = 2.4    # drawPlayer: ctx.lineWidth = 2.4 for the hull; the silhouette is the path offset by half of it
TRIM_W = 1.4   # the stroke as trim round the edge: narrower than the game's, so the sculpted hull shows
FL = 0.5       # engine flicker, 0.4..1 in the game: a short, sturdy plume

# What is made from each ship. Shapes are designed in game units; S turns them into
# millimetres across the face and S * zs up. The rest is in millimetres.
VARIANTS = {
    # hanging nose-up from a tab past the nose
    'keychain': dict(
        S=1.2, zs=1.0,               # EMBER comes out 61 mm tip to tail
        cell=0.25,                   # mesh grid step, game units
        edge=1.0,                    # thickness at the very edge of a wing
        inlay=0.6, groove=0.45, trench=0.9, raise_=0.3,   # colour depth; engraving depths; how proud the lit strips stand
        thin=0.0,                    # no line thinner than this (mm); the keychain keeps the game's widths
        loop=dict(hole=2.1, outer=4.4, neck=3.0, thick=1.8),   # the tab: a 4.2 mm hole for a jump ring
        socket=None),
    # smaller, a little deeper, flying on a stand
    'mini': dict(
        S=0.7, zs=1.35,
        cell=0.25,
        edge=0.8,
        inlay=0.45, groove=0.35, trench=0.7, raise_=0.25,
        thin=0.8,                    # so it prints on a 0.4 mm nozzle
        loop=None,
        socket=dict(r=1.65, depth=1.5)),   # takes the stand's 3.0 mm peg, at the ship's balance point
}

# The mini's stand, in millimetres: a disc of arena floor (its grid cut in) and a post.
STAND = dict(r=13.0, base=2.0, top=0.4, grid=4.0, line=0.5, post_r=2.0, post_h=15.0, peg_r=1.5, peg_h=1.3)

CORNER = (0.3, 0.9)   # fillets on the hull's points and in its notches, game units, before the stroke goes round

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


# hullDetail(), transcribed: (segment, line width) in game units. `form` is the sculpt,
# in game units above the edge: the wing's thickness at the root and the tip, the fuselage
# as stations along the ship (x, half-width, height) with an oval section, engine pods
# (y, back x, front x, radius, axis height), and the heights of the canopy and the plume.
PILOTS = {
    'runner': dict(
        name='VOIDRUNNER', col='#67e8f9', filament='cyan',
        grooves=[  # 'rgba(9,15,28,0.8)', lineWidth 1.2: the spine and frame bulkhead, engraved
            (((-5, 0), (15, 0)), 1.2),
            (((-1.5, -5.6), (-1.5, 5.6)), 1.2),
        ],
        trenches=[],
        rects=[(6.4, 2.2, 4.6, 1.5), (6.4, -3.7, 4.6, 1.5)],  # intake slots either side of the canopy, cut deep
        lines=[(s, 1.1) for s in  # rgba(hullCol, 0.8): the wing spars, as lit strips
               mirror(((5.4, 8.2), (-4.6, 11.8))) + mirror(((2.6, 4.2), (-3.6, 9.2)))],
        hot=[],
        canopy=(3, 0, 3.1, 1.9),  # a blister on the runner
        flames=[[(-6.5, sd * 4.6), (-17 - 5 * FL, sd * 3), (-6.5, sd * 1.7)] for sd in (1, -1)],
        light={'canopy': '#e0f2fe', 'flame': '#e0f2fe'},
        form=dict(root=1.1, tip=0.3, bevel=1.4, slope=1.3,
                  fuselage=[(21.5, 0, 0), (19, 0.7, 0.5), (15, 1.4, 1.3), (10, 2.3, 2.1), (5, 2.9, 2.7),
                            (0, 3.0, 2.9), (-4, 2.7, 2.7), (-8, 2.3, 2.3)],
                  pods=[(sd * 3.2, -12, -0.5, 1.45, 0.75) for sd in (1, -1)],   # twin nozzles
                  canopy=1.3, plume=0.9),
    ),
    'ember': dict(
        name='EMBER', col='#f87171', filament='coral red',
        grooves=[  # heat vanes across the hammer shoulders, engraved
            (s, 1.6) for i in range(3)
            for s in mirror(((4.4 - i * 3.6, 6.6 + i * 1.1), (4.4 - i * 3.6 - 2.6, 11.8)))],
        trenches=[(((3, 0), (18, 0)), 3.4)],  # the rail's channel down the nose: a railgun's trench
        rects=[],
        lines=[(s, 1.0) for s in  # rgba(hullCol, 0.85): the rail and its braces, raised
               mirror(((4, 2), (17.5, 2))) + mirror(((6, 5.4), (12, 3.2)))],
        hot=[(s, 1.2) for s in mirror(((1, 8.4), (-4, 11.4)))],  # '#fb923c': the vanes glow when there is heat in the gun
        canopy=(-1.4, 0, 2.5, 1.8),  # a slit set back behind the rail
        flames=[[(-7, 3.4), (-21 - 7 * FL, 0), (-7, -3.4)]],  # one heavy engine, running hot
        light={'canopy': '#e0f2fe', 'flame': '#fed7aa'},
        form=dict(root=1.2, tip=0.35, bevel=1.4, slope=1.3,
                  fuselage=[(25, 0, 0), (23, 0.5, 0.45), (20, 1.3, 1.1), (16, 1.9, 1.6), (12, 2.5, 2.1),
                            (7, 3.4, 2.8), (2, 3.9, 3.2), (-3, 3.8, 3.2), (-7, 3.2, 2.8), (-10, 2.7, 2.4)],
                  pods=[],
                  canopy=1.2, plume=1.2),
    ),
}


# ------------------------------------------------------- distance fields
class Field:
    """A grid of sample points; every region is a signed distance on it (< 0 inside)."""

    def __init__(self, x0, x1, y0, y1, step=GRID):
        self.h = step
        self.xs = np.arange(x0, x1 + step, step)
        self.ys = np.arange(y0, y1 + step, step)
        self.X, self.Y = np.meshgrid(self.xs, self.ys)

    def polygon(self, pts):
        return poly_sdf(self.X, self.Y, pts)

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

    def ellipse(self, cx, cy, rx, ry):
        """Near enough a distance near the edge, which is all a region needs."""
        q = np.hypot((self.X - cx) / rx, (self.Y - cy) / ry)
        return (q - 1) * min(rx, ry)


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


def smax(a, b, k):
    return -smin(-a, -b, k)


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
    for k, x, y in zip(h, x0 + (j + t) * field.h, y0 + i * GRID):
        pos[int(k)] = (float(x), float(y))
    v = ids[ids >= nH] - nH
    i, j = v // nx, v % nx
    t = F[i, j] / (F[i, j] - F[i + 1, j])
    for k, x, y in zip(v + nH, x0 + j * GRID, y0 + (i + t) * field.h):
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
        self.slab = None   # set by slab(): its compact form

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


def transform(sh, fn):
    """Move a shell's vertices through fn((x, y, z)) -> (x, y, z). fn must keep handedness."""
    out = Shell()
    out.v = [fn(p) for p in sh.v]
    out.f = list(sh.f)
    out.smooth = list(sh.smooth)
    out.slab = getattr(sh, 'slab', None)
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


# ----------------------------------------------------------- sculpted slabs
# Marching squares, but filling: the piece of each grid cell inside the region, as the
# corners (c) and edge crossings (e) met walking round the cell anticlockwise. Every
# piece is convex, so a fan from its first point triangulates it, and a crossing
# followed by a crossing is a stretch of the region's edge, where a wall goes.
CASES = {}
for _case in range(1, 16):
    _in = [(_case >> k) & 1 for k in range(4)]
    _seq = []
    for k in range(4):
        if _in[k]:
            _seq.append(('c', k))
        if _in[k] != _in[(k + 1) % 4]:
            _seq.append(('e', k))
    CASES[_case] = _seq


def slab(fld, F, top, bot):
    """The solid between two height fields (mm, on the grid's nodes) over the region F < 0,
    as one closed shell: its top follows `top`, its bottom `bot`, and a wall stands on the edge."""
    F = np.where(F == 0, 1e-9, F)
    ny, nx = F.shape
    top = np.broadcast_to(np.asarray(top, dtype=float), F.shape)
    bot = np.broadcast_to(np.asarray(bot, dtype=float), F.shape)
    inside = F < 0
    sh = Shell()
    if not inside.any():
        return sh
    if inside[0].any() or inside[-1].any() or inside[:, 0].any() or inside[:, -1].any():
        raise RuntimeError('a region touches the edge of the grid')
    N, NH = ny * nx, ny * (nx - 1)
    case = inside[:-1, :-1] * 1 + inside[:-1, 1:] * 2 + inside[1:, 1:] * 4 + inside[1:, :-1] * 8
    I, J = np.indices(case.shape)
    corner = [lambda i, j: i * nx + j, lambda i, j: i * nx + j + 1,
              lambda i, j: (i + 1) * nx + j + 1, lambda i, j: (i + 1) * nx + j]
    edge = [lambda i, j: N + i * (nx - 1) + j, lambda i, j: N + NH + i * nx + j + 1,
            lambda i, j: N + (i + 1) * (nx - 1) + j, lambda i, j: N + NH + i * nx + j]
    tris, segs = [], []
    for c, seq in CASES.items():
        m = case == c
        if not m.any():
            continue
        i, j = I[m], J[m]
        ids = np.stack([(corner if kind == 'c' else edge)[k](i, j) for kind, k in seq], 1)
        for t in range(1, len(seq) - 1):
            tris.append(ids[:, [0, t, t + 1]])
        for a in range(len(seq)):
            b = (a + 1) % len(seq)
            if seq[a][0] == 'e' and seq[b][0] == 'e':
                segs.append(ids[:, [a, b]])
    tris, segs = np.concatenate(tris), np.concatenate(segs)
    used = np.unique(tris)
    xy = np.empty((len(used), 2))
    zt, zb = np.empty(len(used)), np.empty(len(used))
    m = used < N
    ii, jj = used[m] // nx, used[m] % nx
    xy[m] = np.column_stack([fld.xs[jj], fld.ys[ii]])
    zt[m], zb[m] = top[ii, jj], bot[ii, jj]
    for m, step in (((used >= N) & (used < N + NH), 'h'), (used >= N + NH, 'v')):
        e = used[m] - (N if step == 'h' else N + NH)
        ii, jj = (e // (nx - 1), e % (nx - 1)) if step == 'h' else (e // nx, e % nx)
        i2, j2 = (ii, jj + 1) if step == 'h' else (ii + 1, jj)
        t = F[ii, jj] / (F[ii, jj] - F[i2, j2])
        xy[m] = np.column_stack([fld.xs[jj] + (t * fld.h if step == 'h' else 0),
                                 fld.ys[ii] + (t * fld.h if step == 'v' else 0)])
        zt[m] = top[ii, jj] + t * (top[i2, j2] - top[ii, jj])
        zb[m] = bot[ii, jj] + t * (bot[i2, j2] - bot[ii, jj])
    if (zt - zb).min() < 0.05:
        raise RuntimeError(f'a slab is {(zt - zb).min():.2f} mm thick somewhere')
    n = len(used)
    T, G = np.searchsorted(used, tris), np.searchsorted(used, segs)
    v = np.concatenate([np.column_stack([xy, zt]), np.column_stack([xy, zb])])
    f = np.concatenate([T, T[:, ::-1] + n,
                        np.column_stack([G[:, 0] + n, G[:, 1] + n, G[:, 1]]),
                        np.column_stack([G[:, 0] + n, G[:, 1], G[:, 0]])])
    sh.v = [tuple(q) for q in v.tolist()]
    sh.f = [tuple(q) for q in f.tolist()]
    sh.smooth = [True] * len(T) + [False] * (len(f) - len(T))
    sh.slab = dict(n=n, T=T, G=G)   # enough to build the rest again: the page ships slabs this way
    return sh


# ------------------------------------------------------- keychain and mini
def build(pilot, vname):
    """One ship made one way. Returns its parts ({part: [(element, shell)]}, millimetres)
    and what the pieces around it need: its size, and the hole or the socket."""
    spec, V = PILOTS[pilot], VARIANTS[vname]
    S, ZS, form = V['S'], V['zs'], spec['form']
    h = V['cell']
    path = fillet(hull_points(pilot), *CORNER)
    flame_pts = [fillet(t, 0.8) for t in spec['flames']]
    hw = RIM_W / 2

    nose = max(p[0] for p in path) + hw
    reach = max(abs(p[1]) for p in path) + hw
    tail = min(min(p[0] for p in fl) for fl in flame_pts)
    L = V['loop']
    if L:
        loop_r, hole_r = L['outer'] / S, L['hole'] / S
        loop_cx = nose + loop_r - 1.0
        front = loop_cx + loop_r
    else:
        front = nose
    fld = Field(tail - 2, front + 2, -reach - 2, reach + 2, step=h)
    X, Y = fld.X, fld.Y
    far = np.full(X.shape, 1e3)
    thin = V['thin'] / S

    # --- regions (< 0 inside), game units
    O = fld.polygon(path) - hw                     # the silhouette: the hull and its stroke
    d = -O                                         # how far in from the edge
    rim = np.maximum(O, d - TRIM_W)                # the stroke as trim, round every edge
    inner = O + TRIM_W                             # inside the trim

    def seg(a, b, w):
        return fld.capsule(a, b, max(w, thin))

    lines = U(*[seg(a, b, w) for (a, b), w in spec['lines']])
    lit = np.maximum(lines, O)
    grooves = np.maximum(U(*[seg(a, b, w) for (a, b), w in spec['grooves']], far), inner)
    trench = np.maximum(U(*[seg(a, b, w) for (a, b), w in spec['trenches']], far), inner)
    slots = np.maximum(U(*[fld.rect(*r, r=0.4 * min(r[2], r[3])) for r in spec['rects']], far), inner)
    hot = np.maximum(U(*[seg(a, b, w) for (a, b), w in spec['hot']], far), inner)
    cx, cy, rx, ry = spec['canopy']
    canopy = np.maximum(fld.ellipse(cx, cy, rx, ry), inner)
    flames = U(*[fld.polygon(t) for t in flame_pts])
    if L:
        tab = cut(U(fld.circle(loop_cx, 0, loop_r), fld.capsule((nose - 2.5, 0), (loop_cx, 0), L['neck'] * 2 / S)),
                  fld.circle(loop_cx, 0, hole_r))
    else:
        tab = far
    whole = U(O, tab)

    # --- the sculpt, game units above the edge
    # the wing: thick at the root, thin at the tip, its edge rounded over
    wing = form['tip'] + (form['root'] - form['tip']) * (1 - np.clip(np.abs(Y) / reach, 0, 1))
    plate = wing * np.sqrt(1 - (1 - np.clip(d / form['bevel'], 0, 1)) ** 2)
    xs, hws, hts = (np.array(c, dtype=float) for c in zip(*sorted(form['fuselage'])))
    fw, fh = np.interp(X, xs, hws, 0, 0), np.interp(X, xs, hts, 0, 0)
    fus = fh * np.sqrt(np.clip(1 - (Y / np.maximum(fw, 1e-6)) ** 2, 0, 1))
    shape = smax(plate, fus, 0.6)
    for yc, xb, xf, r, cz in form['pods']:
        rr = r * np.sqrt(np.clip((xf - X) / (1.2 * r), 0, 1)) * (X >= xb)
        pod = np.where(np.abs(Y - yc) < rr, cz + np.sqrt(np.clip(rr ** 2 - (Y - yc) ** 2, 0, None)), -1.0)
        shape = smax(shape, pod, 0.5)
    shape = np.maximum(smin(shape, form['slope'] * d, 0.4), 0)   # every surface comes down to the edge
    z = V['edge'] + shape * S * ZS                 # millimetres
    if L:
        dt = -tab * S                              # the tab: flat, its edges rounded over 0.8 mm
        z = np.maximum(z, 0.8 + (L['thick'] - 0.8) * np.sqrt(1 - (1 - np.clip(dt / 0.8, 0, 1)) ** 2))

    soft = lambda F: np.clip(0.5 - F / h, 0, 1)    # a mask with its edge spread over one cell
    body_top = z - np.maximum.reduce([V['groove'] * soft(grooves), V['trench'] * soft(trench),
                                      1.6 * V['groove'] * soft(slots)])
    bot = 0.0
    sx = 0.0
    if V['socket']:
        # at the balance point: the middle of the ship, weighted by how tall it is
        w = np.where(O < 0, z, 0)
        sx = float((X * w).sum() / w.sum())
        bot = V['socket']['depth'] * soft(fld.circle(sx, 0, V['socket']['r'] / S))

    bubble = form['canopy'] * S * ZS * np.sqrt(np.clip(1 - ((X - cx) / rx) ** 2 - ((Y - cy) / ry) ** 2, 0, 1))
    fl_in = -flames
    fx = [(min(p[0] for p in t), max(p[0] for p in t)) for t in flame_pts]
    along = np.max([np.clip((X - a) / (b - a), 0, 1) for a, b in fx], axis=0) ** 0.6
    plume = 0.7 * V['edge'] + form['plume'] * S * ZS * np.sqrt(np.clip(fl_in / 0.9, 0, 1)) * along

    rim_c = cut(rim, tab, lit)
    hot_c = cut(hot, lit, canopy)
    inlays = U(rim_c, lit, hot_c, canopy)
    under = np.maximum(inlays, whole)
    deep = z - V['inlay']

    layers = {
        'hull': [(cut(whole, inlays), body_top, bot), (under, deep, bot)],
        'neon': [(rim_c, z, deep), (lit, z + V['raise_'], deep)],
        'hot': [(hot_c, z + 0.8 * V['raise_'], deep)] if spec['hot'] else [],
        'light': [(canopy, z + bubble, deep, 'canopy'), (cut(flames, whole), plume, 0.0, 'flame')],
    }

    def place(sh):
        # game x (the nose) points up the model: a quarter turn, so the triangles keep their winding
        return transform(sh, lambda p: (-p[1] * S, p[0] * S, p[2]))

    parts = {}
    for name, stack in layers.items():
        for F, top, bottom, *el in stack:
            sh = slab(fld, F, top, bottom)
            if sh.f:
                parts.setdefault(name, []).append((el[0] if el else name, place(sh)))

    # the origin: the socket on a mini (where the peg goes), the middle of the face on a keychain
    allv = np.concatenate([np.array(s.v) for v in parts.values() for _, s in v])
    lo, hi = allv.min(0), allv.max(0)
    ox, oy = (0.0, sx * S) if V['socket'] else ((lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2)
    parts = {k: [(el, transform(s, lambda p: (p[0] - ox, p[1] - oy, p[2]))) for el, s in v]
             for k, v in parts.items()}
    info = dict(size=[round(float(x), 1) for x in hi - lo],
                extent=[round(float(lo[0] - ox), 2), round(float(lo[1] - oy), 2),
                        round(float(hi[0] - ox), 2), round(float(hi[1] - oy), 2)])
    if L:
        info['hole'] = [round(-ox, 2) + 0.0, round(loop_cx * S - oy, 2) + 0.0, L['hole'], L['thick']]
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
