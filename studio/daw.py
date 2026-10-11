"""VOIDRUNNER's studio (MUSIC-PLAN.md, step 3): a small offline DAW.

A score (studio/scores/*.py) says what is played: notes, drum patterns,
sections and the mix. This file turns it into sound: oscillators, filters, a
sampler for the raw one-shots in music-src/, reverb, delay, sidechain, a glue
compressor and a limiter. build.py cuts the result into the bar-aligned Opus
pieces the game's Music engine plays, and writes the manifest.

How a track becomes pieces. The game moves between sections on bar lines
(calm to fight, a boss's phases), so any piece may be followed by several
others. A piece therefore holds only the notes that START inside its bars,
rendered from silence, and keeps ringing past its last bar line for as long
as they do (reverb, a crash, a held chord's release). The game starts the
next piece on the bar line and lets the last one ring out underneath. Summed,
that is exactly the continuous mix, whichever piece comes next: nothing is
ever cut off and nothing rings that was not played.

The master (compressor and limiter) is not linear, so it cannot be run on
each piece alone. It runs on the section as it sounds looped, and the gain
it settles on, sample by sample, is then applied to every piece: the pieces
still sum to the mastered loop.

Everything is 48 kHz stereo float; Opus is 48 kHz inside, so nothing is
resampled on the way out.
"""
import os, math, json, hashlib
import numpy as np
import soundfile as sf
import soxr
from scipy import signal
from scipy.ndimage import minimum_filter1d, uniform_filter1d
from numba import njit

SR = 48000
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
RAW = os.path.join(ROOT, 'music-src', 'splice')

# ------------------------------------------------------------------ numbers
def lin(d): return 10.0 ** (d / 20.0)
def dbfs(x): return 20.0 * math.log10(max(float(x), 1e-12))

_PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi(n):
    """'A2', 'C#4', 'Bb3' or a number, as a MIDI note number."""
    if isinstance(n, (int, float, np.integer, np.floating)): return float(n)
    s = n.strip()
    if s[0].isdigit(): return float(s)
    pc = _PC[s[0].upper()]; i = 1
    while i < len(s) and s[i] in '#b':
        pc += 1 if s[i] == '#' else -1; i += 1
    return float(12 * (int(s[i:]) + 1) + pc)
def hz(n): return 440.0 * 2.0 ** ((midi(n) - 69.0) / 12.0)

def st(x):
    """Any buffer as stereo (n, 2) float64."""
    x = np.asarray(x, dtype=np.float64)
    return np.stack([x, x], 1) if x.ndim == 1 else x
def pan(x, p):
    """A mono buffer placed between -1 (left) and 1 (right), equal power."""
    a = (p + 1.0) * math.pi / 4.0
    return np.stack([x * math.cos(a), x * math.sin(a)], 1)
def fit(x, n):
    """x cut or zero-padded to n samples."""
    if len(x) >= n: return x[:n]
    pad = [(0, n - len(x))] + [(0, 0)] * (x.ndim - 1)
    return np.pad(x, pad)
def add(buf, x, at, gain=1.0):
    """x mixed into buf starting at sample `at` (whatever falls outside is dropped)."""
    at = int(round(at))
    if at < 0: x = x[-at:]; at = 0
    n = min(len(x), len(buf) - at)
    if n > 0: buf[at:at + n] += x[:n] * gain
def fade(x, a=0.002, r=0.01):
    """Short linear fades on both ends, so nothing starts or stops on a click."""
    x = x.copy(); na = min(len(x), int(a * SR)); nr = min(len(x), int(r * SR))
    sh = (-1,) + (1,) * (x.ndim - 1)
    if na > 1: x[:na] *= np.linspace(0, 1, na).reshape(sh)
    if nr > 1: x[-nr:] *= np.linspace(1, 0, nr).reshape(sh)
    return x

# -------------------------------------------------------------- oscillators
def _blep(t, dt):
    """The polyBLEP residual: what takes the aliasing out of a naive saw's edge."""
    out = np.zeros_like(t)
    m = t < dt
    x = t[m] / dt[m]; out[m] = x + x - x * x - 1.0
    m = t > 1.0 - dt
    x = (t[m] - 1.0) / dt[m]; out[m] = x * x + x + x + 1.0
    return out
def _phase(freq, n, ph0):
    dt = np.broadcast_to(np.asarray(freq, dtype=np.float64) / SR, (n,)).copy()
    return (ph0 + np.cumsum(dt) - dt) % 1.0, dt
def saw(freq, n, ph=0.0):
    p, dt = _phase(freq, n, ph)
    return 2.0 * p - 1.0 - _blep(p, dt)
def square(freq, n, pw=0.5, ph=0.0):
    p, dt = _phase(freq, n, ph)
    return np.where(p < pw, 1.0, -1.0) + _blep(p, dt) - _blep((p + 1.0 - pw) % 1.0, dt)
def sine(freq, n, ph=0.0):
    p, _ = _phase(freq, n, ph)
    return np.sin(2.0 * math.pi * p)
def tri(freq, n, ph=0.0):
    p, _ = _phase(freq, n, ph)
    return 4.0 * np.abs(p - 0.5) - 1.0
def noise(n, seed=0):
    return np.random.default_rng(seed).standard_normal(n)

def adsr(gate, a=0.005, d=0.1, s=0.7, r=0.1, curve=3.0):
    """An envelope for a note held `gate` seconds; returns gate + release worth of samples."""
    ng, na, nd, nr = int(gate * SR), max(1, int(a * SR)), max(1, int(d * SR)), max(1, int(r * SR))
    env = np.empty(max(ng, 1) + nr)
    att = np.linspace(0.0, 1.0, na, endpoint=False)
    dec = s + (1.0 - s) * np.exp(-curve * np.arange(nd) / nd)
    head = np.concatenate([att, dec])
    if len(head) >= ng: head = head[:max(ng, 1)]
    else: head = np.concatenate([head, np.full(ng - len(head), head[-1])])
    env[:len(head)] = head
    env[len(head):] = head[-1] * np.exp(-5.0 * np.arange(nr) / nr)
    return env

# ------------------------------------------------------------------ filters
@njit(cache=True)
def _svf(x, fc, res, mode):
    """A state-variable filter whose cutoff may move every sample (mode 0 low, 1 high, 2 band)."""
    n = x.shape[0]; y = np.empty(n); ic1 = 0.0; ic2 = 0.0
    k = 1.0 / res
    for i in range(n):
        f = fc[i]
        if f > 0.45 * 48000.0: f = 0.45 * 48000.0
        if f < 10.0: f = 10.0
        g = math.tan(math.pi * f / 48000.0)
        a1 = 1.0 / (1.0 + g * (g + k)); a2 = g * a1; a3 = g * a2
        v3 = x[i] - ic2
        v1 = a1 * ic1 + a2 * v3
        v2 = ic2 + a2 * ic1 + a3 * v3
        ic1 = 2.0 * v1 - ic1; ic2 = 2.0 * v2 - ic2
        if mode == 0: y[i] = v2
        elif mode == 1: y[i] = x[i] - k * v1 - v2
        else: y[i] = v1
    return y
def svf(x, fc, res=0.707, mode='lp'):
    m = {'lp': 0, 'hp': 1, 'bp': 2}[mode]
    fc = np.broadcast_to(np.asarray(fc, dtype=np.float64), (len(x),)).copy()
    if x.ndim == 1: return _svf(np.ascontiguousarray(x, dtype=np.float64), fc, res, m)
    return np.stack([_svf(np.ascontiguousarray(x[:, c], dtype=np.float64), fc, res, m) for c in range(x.shape[1])], 1)

def _sos(x, sos): return signal.sosfilt(sos, x, axis=0)
def lp(x, fc, order=2): return _sos(x, signal.butter(order, min(fc, SR * 0.45), 'low', fs=SR, output='sos'))
def hp(x, fc, order=2): return _sos(x, signal.butter(order, fc, 'high', fs=SR, output='sos'))
def bp(x, lo, hi, order=2): return _sos(x, signal.butter(order, [lo, hi], 'band', fs=SR, output='sos'))
def _rbj(kind, fc, gain_db, q=0.707):
    A = 10.0 ** (gain_db / 40.0); w = 2 * math.pi * fc / SR; cw, sw = math.cos(w), math.sin(w)
    al = sw / (2 * q)
    if kind == 'peak':
        b = [1 + al * A, -2 * cw, 1 - al * A]; a = [1 + al / A, -2 * cw, 1 - al / A]
    elif kind == 'low':
        s2 = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) - (A - 1) * cw + s2), 2 * A * ((A - 1) - (A + 1) * cw), A * ((A + 1) - (A - 1) * cw - s2)]
        a = [(A + 1) + (A - 1) * cw + s2, -2 * ((A - 1) + (A + 1) * cw), (A + 1) + (A - 1) * cw - s2]
    else:
        s2 = 2 * math.sqrt(A) * al
        b = [A * ((A + 1) + (A - 1) * cw + s2), -2 * A * ((A - 1) + (A + 1) * cw), A * ((A + 1) + (A - 1) * cw - s2)]
        a = [(A + 1) - (A - 1) * cw + s2, 2 * ((A - 1) - (A + 1) * cw), (A + 1) - (A - 1) * cw - s2]
    return np.array([[b[0] / a[0], b[1] / a[0], b[2] / a[0], 1.0, a[1] / a[0], a[2] / a[0]]])
def peak(x, fc, gain_db, q=1.0): return _sos(x, _rbj('peak', fc, gain_db, q))
def lowshelf(x, fc, gain_db): return _sos(x, _rbj('low', fc, gain_db))
def highshelf(x, fc, gain_db): return _sos(x, _rbj('high', fc, gain_db))

def drive(x, amount=1.0, mix=1.0):
    """Soft saturation that keeps the level about where it was."""
    if amount <= 0: return x
    k = 1.0 + 4.0 * amount
    y = np.tanh(x * k) / math.tanh(k)
    return x * (1.0 - mix) + y * mix
def clip(x, level=0.7):
    """A drum's first few milliseconds rounded off at `level`: the hit keeps its weight and gives up the
    spike that would otherwise set how loud the whole mix can go."""
    return level * np.tanh(x / level)
def crush(x, bits=8, hold=6):
    """Fewer bits and fewer samples: what a sound is like read back off a damaged record."""
    y = np.repeat(x[::hold], hold, axis=0)[:len(x)]
    q = 2.0 ** (bits - 1)
    return np.round(y * q) / q
def widen(x, amount):
    """Mid/side width: 0 is mono, 1 is as it was, above 1 is wider."""
    m = (x[:, 0] + x[:, 1]) * 0.5; s = (x[:, 0] - x[:, 1]) * 0.5 * amount
    return np.stack([m + s, m - s], 1)

# ----------------------------------------------------------- space and time
_IR = {}
def room(decay=1.8, pre=0.015, bright=7000.0, dark=1800.0, seed=7):
    """A reverb's impulse response: noise that dies away, duller as it goes, a few early echoes first."""
    key = (decay, pre, bright, dark, seed)
    if key in _IR: return _IR[key]
    n = int((decay * 1.25 + pre + 0.05) * SR)
    rng = np.random.default_rng(seed)
    t = np.arange(n) / SR
    nz = rng.standard_normal((n, 2))
    hi = lp(nz, bright); lo = lp(nz, dark)
    blend = np.exp(-t / (decay * 0.3))[:, None]
    ir = (hi * blend + lo * (1.0 - blend)) * np.exp(-6.9 * t / decay)[:, None]
    ir[:int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[:, None]
    for k in range(9):                                  # early reflections, alternating sides
        at = int((0.006 + 0.071 * rng.random()) * SR)
        ir[at, k % 2] += (0.9 - 0.07 * k) * (1 if rng.random() > 0.5 else -1) * 6.0
    ir = hp(ir, 180.0)
    ir = np.concatenate([np.zeros((int(pre * SR), 2)), ir])
    ir /= math.sqrt(float((ir ** 2).sum()))
    _IR[key] = ir
    return ir
def reverb(x, **kw):
    """x through a room, wet only, the same length as x."""
    ir = room(**kw)
    return np.stack([signal.fftconvolve(x[:, c], ir[:, c])[:len(x)] for c in range(2)], 1)
def echo(x, time, fb=0.4, taps=6, damp=4500.0, ping=True):
    """A feedback delay, wet only: each repeat quieter and duller, bouncing side to side."""
    out = np.zeros_like(x); cur = x; d = int(round(time * SR))
    for k in range(1, taps + 1):
        cur = lp(cur, damp) * fb
        if ping: cur = cur[:, ::-1]
        if k * d >= len(x): break
        out[k * d:] += cur[:len(x) - k * d]
    return out

# ----------------------------------------------------------------- dynamics
@njit(cache=True)
def _follow(level, att, rel):
    out = np.empty_like(level); cur = 0.0
    for i in range(len(level)):
        c = att if level[i] > cur else rel
        cur = cur + (level[i] - cur) * c
        out[i] = cur
    return out
def comp_gain(x, thr_db=-14.0, ratio=2.0, att=0.02, rel=0.25, knee=6.0):
    """A compressor's gain, sample by sample (stereo-linked), without applying it."""
    lev = _follow(np.abs(x).max(axis=1), 1.0 - math.exp(-1.0 / (att * SR)), 1.0 - math.exp(-1.0 / (rel * SR)))
    d = 20.0 * np.log10(np.maximum(lev, 1e-9)) - thr_db
    over = np.where(d <= -knee / 2, 0.0, np.where(d >= knee / 2, d, (d + knee / 2) ** 2 / (2 * knee)))
    return 10.0 ** (-over * (1.0 - 1.0 / ratio) / 20.0)
@njit(cache=True)
def _release(g, coef):
    out = np.empty_like(g); cur = 1.0
    for i in range(len(g)):
        if g[i] < cur: cur = g[i]
        else: cur = cur + (g[i] - cur) * coef
        out[i] = cur
    return out
def limit_gain(x, ceil_db=-1.0, look=0.005, rel=0.08):
    """A look-ahead limiter's gain: it is already down when the peak arrives, so nothing is clipped."""
    L = max(2, int(look * SR))
    need = np.minimum(1.0, lin(ceil_db) / np.maximum(np.abs(x).max(axis=1), 1e-9))
    ahead = minimum_filter1d(need, size=L, origin=-(L // 2), mode='nearest')     # the least over the next L samples
    held = _release(ahead, 1.0 - math.exp(-1.0 / (rel * SR)))
    return uniform_filter1d(held, size=L, origin=(L // 2) - (1 - L % 2), mode='nearest')   # eased in over the last L

def clip_gain(x, knee_db=-6.0, ceil_db=-0.6):
    """A soft clipper as a gain: untouched under the knee, bent towards the ceiling above it. On a full mix
    it only ever catches the first milliseconds of a drum, which is where the level it frees comes from."""
    m = np.abs(x).max(axis=1); T = lin(knee_db); C = lin(ceil_db)
    over = m > T
    g = np.ones(len(m))
    g[over] = (T + (C - T) * np.tanh((m[over] - T) / (C - T))) / m[over]
    return g

def loudness(x):
    """The gated RMS in dBFS the reference tracks were measured with (MUSIC-PLAN.md), so the two compare."""
    blk = int(0.4 * SR)
    if len(x) <= blk: return dbfs(math.sqrt(float((x ** 2).mean()) + 1e-12))
    r = np.array([math.sqrt(float((x[i:i + blk] ** 2).mean()) + 1e-12) for i in range(0, len(x) - blk, blk // 4)])
    d = 20 * np.log10(r); g = d[d > -70]
    if not len(g): return -120.0
    g = g[g > (10 * math.log10(float(np.mean(10 ** (g / 10)))) - 10)]
    return 10 * math.log10(float(np.mean(10 ** (g / 10))))

def duck_curve(kicks, length, depth=0.5, hold=0.02, rel=0.16, wrap=True):
    """The sidechain: one loop's worth of gain that dips on every kick and swells back (the pump).
    wrap: a kick late in the loop still holds down its start, as it does going round."""
    n = int(round(length * SR)); g = np.ones(n)
    ks = sorted({int(round(k * SR)) % n for k in kicks}) if n else []
    if not ks or depth <= 0: return g
    mark = np.full(n, -1, dtype=np.int64); mark[ks] = ks
    last = np.maximum.accumulate(mark)
    since = (np.arange(n) - np.where(last < 0, ks[-1] - n, last)) / SR
    if not wrap: since = np.where(last < 0, 1e9, since)
    att = np.clip(since / 0.004, 0.0, 1.0)               # 4 ms down, so the dip itself does not click
    dip = np.where(since < hold, 1.0, np.exp(-(since - hold) / rel)) * att
    return 1.0 - depth * dip

# ------------------------------------------------------------------ samples
_S = {}
def sample(name, trim=True, norm=True):
    """A raw one-shot from music-src/splice at 48 kHz stereo, its silence before the hit trimmed off."""
    key = (name, trim, norm)
    if key in _S: return _S[key]
    path = os.path.join(RAW, name if name.lower().endswith('.wav') else name + '.wav')
    x, sr = sf.read(path, always_2d=True, dtype='float64')
    if x.shape[1] == 1: x = np.repeat(x, 2, axis=1)
    x = x[:, :2]
    if sr != SR: x = soxr.resample(x, sr, SR, quality='VHQ')
    if trim:
        env = np.abs(x).max(axis=1); thr = env.max() * 0.02
        on = int(np.argmax(env > thr))
        x = x[max(0, on - int(0.001 * SR)):]
        x = fade(x, 0.0005, 0.005)
    if norm: x = x / max(1e-9, float(np.abs(x).max()))
    _S[key] = x
    return x
def shift(x, semis):
    """A sample replayed faster or slower: pitch and length move together, as on a sampler."""
    if abs(semis) < 1e-6: return x
    return soxr.resample(x, SR * 2.0 ** (semis / 12.0), SR, quality='HQ')
def gate(x, secs, rel=0.03):
    """A sample cut to `secs` with a short release, as a hand lifting off a string."""
    n = int(secs * SR)
    if n >= len(x): return x
    nr = min(int(rel * SR), len(x) - n)
    y = x[:n + nr].copy()
    y[n:] *= np.linspace(1, 0, nr)[:, None]
    return y

# -------------------------------------------------------------- the writing
class Ev:
    """One note: when (seconds into the section), how long, what pitch (MIDI), how hard, and anything else."""
    __slots__ = ('t', 'dur', 'p', 'v', 'kw')
    def __init__(self, t, dur, p, v=1.0, **kw): self.t = t; self.dur = dur; self.p = p; self.v = v; self.kw = kw

CHORDS = {'': (0, 4, 7), 'm': (0, 3, 7), '5': (0, 7), 'sus2': (0, 2, 7), 'sus4': (0, 5, 7), 'm7': (0, 3, 7, 10),
          '7': (0, 4, 7, 10), 'maj7': (0, 4, 7, 11), 'dim': (0, 3, 6), 'add9': (0, 4, 7, 14), 'm9': (0, 3, 7, 14)}
def chord(sym, octave=3):
    """'Am', 'G', 'F#m7', 'E5': the chord's notes as MIDI, the root in `octave`."""
    i = 2 if len(sym) > 1 and sym[1] in '#b' else 1
    root = midi(sym[:i] + str(octave))
    return [root + k for k in CHORDS[sym[i:]]]

class Section:
    """A stretch of the track the game can loop or move to: its bars, and every bus's notes."""
    def __init__(self, song, name, bars, seg=4, loop=True, next=None, lock=False, level=0.0):
        self.song, self.name, self.bars, self.seg = song, name, bars, seg
        self.loop, self.next, self.lock = loop, next, lock
        self.level = level                # dB against the track's other sections, kept by the master
        self.ev = {}                      # bus name -> [Ev]
        self.len = bars * song.bar
    def at(self, bar, step=0.0):
        """Seconds into the section. With swing, the first sixteenth of every pair is long and the second
        short (0.5 is straight, 0.667 a triplet's swing), as a drummer would lean on it."""
        sw = self.song.swing
        if sw != 0.5:
            pair = math.floor(step / 2.0); f = step - 2.0 * pair
            step = 2.0 * pair + (f * 2.0 * sw if f < 1.0 else 2.0 * sw + (f - 1.0) * 2.0 * (1.0 - sw))
        return bar * self.song.bar + step * self.song.step
    def note(self, bus, bar, step, dur, p, v=1.0, **kw):
        """A note on `bus` at bar:step (16ths), `dur` steps long."""
        t = self.at(bar, step)
        self.ev.setdefault(bus, []).append(Ev(t, self.at(bar, step + dur) - t, midi(p), v, **kw))
    def line(self, bus, bar, text, v=1.0, octave=0, **kw):
        """A melody written out: 'A4:2 C5:2 r:4 E5:8', each note or rest (r) and its length in 16ths.
        A trailing ' after the length ties nothing; '~' before a note slides into it (kw glide)."""
        step = 0.0
        for tok in text.split():
            name, _, d = tok.partition(':'); d = float(d or 1)
            acc = 1.0
            if name.endswith('!'): name = name[:-1]; acc = 1.25
            if name != 'r': self.note(bus, bar, step, d, midi(name) + 12 * octave, v * acc, **kw)
            step += d
        return step
    def hits(self, bus, bar, pattern, p=60, v=1.0, steps=None, **kw):
        """A drum line for one bar: 'x' full, 'o' softer, '-' a ghost, '.' rest; as many steps as characters."""
        pattern = pattern.replace(' ', '').replace('|', '')
        n = steps or len(pattern); w = 16.0 / n
        for i, ch in enumerate(pattern):
            lv = {'x': 1.0, 'X': 1.2, 'o': 0.7, '-': 0.42}.get(ch)
            if lv: self.note(bus, bar, i * w, w, p, v * lv, **kw)
    def chordn(self, bus, bar, step, dur, sym, octave=3, v=1.0, **kw):
        for m in chord(sym, octave): self.note(bus, bar, step, dur, m, v, **kw)

class Bus:
    """One instrument's channel: what plays its notes, then its effects, level, place and sends."""
    def __init__(self, inst, gain=1.0, fx=(), rev=0.0, dly=0.0, duck=0.0, key=False):
        self.inst, self.gain, self.fx, self.rev, self.dly, self.duck, self.key = inst, gain, fx, rev, dly, duck, key

class Song:
    def __init__(self, name, bpm, beats=4, steps=16, target=-12.0, ceil=-1.2, clip=5.0, tail=4.5, room=None, echo=None, master=None, swing=0.5):
        self.name, self.bpm, self.swing = name, bpm, swing
        self.bar = 60.0 / bpm * beats; self.step = self.bar / steps; self.beat = 60.0 / bpm
        self.bus, self.sections, self.moods, self.start = {}, [], {}, None
        self.target, self.ceil, self.tail = target, ceil, tail
        self.clip = clip               # how far under the ceiling the clipper starts to bend, in dB
        self.room = room or dict(decay=1.9, pre=0.018)
        self.echo = echo or dict(time=self.beat * 0.75, fb=0.38, taps=5)
        self.master = master           # a function over the stereo mix: linear EQ only (it runs piece by piece)
    def add(self, name, bus): self.bus[name] = bus; return bus
    def section(self, name, bars, **kw):
        s = Section(self, name, bars, **kw); self.sections.append(s); return s

    # -- rendering ---------------------------------------------------------
    def _kicks(self, sec):
        return [e.t for name, b in self.bus.items() if b.key for e in sec.ev.get(name, [])]
    def piece(self, sec, k):
        """Segment k of a section: the notes that start in it, from silence, ringing out past its end."""
        L = sec.seg * self.bar; t0 = k * L
        nseg = int(round(L * SR)); n = nseg + int(self.tail * SR)
        dry = np.zeros((n, 2)); rv = np.zeros((n, 2)); dl = np.zeros((n, 2))
        looped = sec.loop
        duck1 = {}
        for name, b in self.bus.items():
            evs = [e for e in sec.ev.get(name, []) if t0 - 1e-9 <= e.t < t0 + L - 1e-9]
            if not evs: continue
            x = b.inst([Ev(e.t - t0, e.dur, e.p, e.v, **e.kw) for e in evs], n, dict(t0=t0, song=self, sec=sec))
            for f in b.fx: x = f(x)
            x = fit(st(x), n) * b.gain
            if b.duck > 0:
                if b.duck not in duck1:
                    duck1[b.duck] = duck_curve(self._kicks(sec), sec.len, depth=b.duck, wrap=looped)
                c = duck1[b.duck]; i0 = int(round(t0 * SR))
                idx = np.arange(i0, i0 + n)
                g = c[idx % len(c)] if looped else np.where(idx < len(c), c[np.minimum(idx, len(c) - 1)], 1.0)
                x = x * g[:, None]
            dry += x
            if b.rev: rv += x * b.rev
            if b.dly: dl += x * b.dly
        out = dry
        if rv.any(): out = out + reverb(rv, **self.room)
        if dl.any():
            e = echo(dl, **self.echo)
            out = out + e + reverb(e, **self.room) * 0.25
        if self.master: out = self.master(out)
        return out * lin(sec.level)

    def render(self, log=print):
        """Every section's pieces, mastered. Returns {section: [pieces]} and the numbers for the report."""
        raw = {}
        for sec in self.sections:
            raw[sec.name] = [self.piece(sec, k) for k in range(int(math.ceil(sec.bars / sec.seg)))]
        loops = {s.name: self._loop(s, raw[s.name]) for s in self.sections}
        # one gain for the whole track, set so its loudest section lands on the target once limited
        ref = max(loops, key=lambda k: loudness(loops[k]))
        G = lin(self.target - loudness(loops[ref]))
        for _ in range(6):
            y, _ = self._mastered(loops[ref] * G)
            err = self.target - loudness(y)
            if abs(err) < 0.1: break
            G *= lin(err)
        out, stats = {}, {}
        for sec in self.sections:
            y, g = self._mastered(loops[sec.name] * G, periodic=sec.loop)
            nseg = int(round(sec.seg * self.bar * SR)); pcs = []
            for k, p in enumerate(raw[sec.name]):
                idx = np.arange(k * nseg, k * nseg + len(p))
                gg = g[idx % len(g)] if sec.loop else g[np.minimum(idx, len(g) - 1)]
                pcs.append(self._trim(p * G * gg[:, None], nseg))
            out[sec.name] = pcs
            before = loops[sec.name] * G
            stats[sec.name] = dict(loud=round(loudness(y), 1), peak=round(dbfs(np.abs(y).max()), 1),
                                   gr=round(dbfs(g.min()), 1), gr_typ=round(dbfs(float(np.percentile(g, 1))), 1),
                                   raw_crest=round(dbfs(np.abs(before).max()) - loudness(before), 1), secs=round(sec.len, 3))
            log(f"  {self.name}.{sec.name:8s} {sec.bars:3d} bars {sec.len:6.1f}s  gain {dbfs(G):5.1f}  loud {stats[sec.name]['loud']:6.1f}  "
                f"peak {stats[sec.name]['peak']:5.1f}  raw crest {stats[sec.name]['raw_crest']:4.1f}  master takes off at most {-stats[sec.name]['gr']:4.1f} dB, "
                f"{-stats[sec.name]['gr_typ']:3.1f} for 1% of the time")
        return out, dict(gain_db=round(dbfs(G), 1), sections=stats)

    def _loop(self, sec, pieces):
        """The section as it sounds going round: the pieces laid end to end, the tails folded back in."""
        nseg = int(round(sec.seg * self.bar * SR)); n = nseg * len(pieces)
        if sec.loop:
            y = np.zeros((n, 2))
            for k, p in enumerate(pieces):
                for i in range(0, len(p), n):
                    at = (k * nseg + i) % n
                    chunk = p[i:i + n]
                    first = min(len(chunk), n - at)
                    y[at:at + first] += chunk[:first]
                    if first < len(chunk): y[:len(chunk) - first] += chunk[first:]
            return y
        y = np.zeros((n + int(self.tail * SR), 2))
        for k, p in enumerate(pieces): add(y, p, k * nseg)
        return y
    def _mastered(self, x, periodic=False):
        """The master's gain over x: a gentle glue, a clipper that rounds off the drum hits, then the
        limiter for what is left. All three are a gain per sample (the clipper too: what it does to the
        sum is a gain on the sum), which is what lets the pieces be mastered apart and still add up.
        Periodic: as the third time round a loop."""
        src = np.concatenate([x, x, x]) if periodic else x
        g = comp_gain(src, thr_db=-18.0, ratio=1.5, att=0.04, rel=0.35, knee=10.0)
        g = g * clip_gain(src * g[:, None], knee_db=self.ceil - self.clip, ceil_db=self.ceil + 0.6)
        g = g * limit_gain(src * g[:, None], ceil_db=self.ceil)
        if periodic: g = g[len(x):2 * len(x)]
        return x * g[:, None], g
    def _trim(self, p, nseg):
        """A piece cut where its ring has died away (never inside its own bars), and faded out there."""
        env = np.abs(p).max(axis=1)
        live = np.nonzero(env > lin(-72.0))[0]
        end = max(nseg, (int(live[-1]) + 1) if len(live) else nseg)
        end = min(len(p), end + int(0.02 * SR))
        p = p[:end].copy()
        nf = min(int(0.03 * SR), max(0, end - nseg))
        if nf > 1: p[-nf:] *= np.linspace(1, 0, nf)[:, None]
        return p

    def playthrough(self, pieces, order):
        """The pieces as the game would play them through `order` (section names), for listening and measuring."""
        nseg = {s.name: int(round(s.seg * self.bar * SR)) for s in self.sections}
        total = sum(nseg[o] * len(pieces[o]) for o in order) + int(self.tail * SR)
        y = np.zeros((total, 2)); at = 0
        for o in order:
            for p in pieces[o]:
                add(y, p, at); at += nseg[o]
        return y

# ------------------------------------------------------------------ writing
def write_opus(path, x, quality=0.64):
    """Ogg Opus through libsndfile. 0.64 comes out near 96 kbit/s for stereo (0 is about 256, 1 about 6)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    sf.write(path, np.clip(x, -1.0, 1.0).astype(np.float32), SR, format='OGG', subtype='OPUS', compression_level=quality)
def digest(x): return hashlib.sha1(np.ascontiguousarray(x, dtype=np.float32).tobytes()).hexdigest()[:6]

def measure(x):
    """What the report says about a mix: loudness, crest, where the power sits, width, and how much is left
    for a laptop speaker (nothing under 200 Hz)."""
    m = x.mean(axis=1)
    f, P = signal.welch(m, SR, nperseg=8192)
    tot = float(P.sum()) + 1e-20
    def band(a, b): return round(float(P[(f >= a) & (f < b)].sum()) / tot, 3)
    mid, side = (x[:, 0] + x[:, 1]) / 2, (x[:, 0] - x[:, 1]) / 2
    L = loudness(x); pk = dbfs(np.abs(x).max())
    return dict(loud=round(L, 1), peak=round(pk, 1), crest=round(pk - L, 1),
                low=band(0, 250), mid=band(250, 4000), air=band(4000, SR / 2),
                width=round(float(np.sqrt((side ** 2).mean()) / (np.sqrt((mid ** 2).mean()) + 1e-9)), 2),
                small=round(loudness(hp(x, 200.0, 4)) - L, 1))
