"""The studio's instruments (MUSIC-PLAN.md, step 3). Each is a function
(notes, samples, context) -> stereo sound, made by one of the builders here:

  hit      a sampled drum or one-shot, struck at each note
  synth    a subtractive synth: saws or squares, a filter that moves, an envelope
  guitar   palm-mute chugs and power chords from the raw recordings, double-tracked
  keys     an FM bell / electric piano, for the quiet rooms
  clips    ready-made sounds (a riser, an impact) dropped in by name

and the sound design they share (a synthesized kick, risers, impacts).
"""
import math
import numpy as np
from daw import (SR, st, pan, fit, add, fade, saw, square, sine, tri, noise, adsr, svf, lp, hp, bp, peak,
                 lowshelf, highshelf, drive, widen, sample, shift, gate, hz, midi, lin, reverb)

# ------------------------------------------------------------------- drums
def hit(src, vel=1.6, human=0.0, tune=0.0, choke=None, seed=11):
    """A drum. `src` is one sound or several takes (stereo arrays), cycled so no two hits in a row match.
    vel: how steeply a soft note gets quieter. human: seconds of looseness in the timing.
    choke: seconds after which the next hit cuts this one (a closed hat stopping an open one)."""
    takes = [st(s) for s in (src if isinstance(src, (list, tuple)) else [src])]
    def play(evs, n, ctx):
        out = np.zeros((n, 2))
        rng = np.random.default_rng(seed + int(ctx['t0'] * 1000))
        evs = sorted(evs, key=lambda e: e.t)
        for i, e in enumerate(evs):
            x = takes[(i + int(ctx['t0'] * 7)) % len(takes)]
            semi = e.kw.get('semi', 0.0) + tune
            if semi: x = shift(x, semi)
            if e.kw.get('len'): x = gate(x, e.kw['len'], 0.04)
            if choke and i + 1 < len(evs): x = gate(x, max(0.02, evs[i + 1].t - e.t), choke)
            t = e.t + (rng.uniform(-human, human) if human else 0.0)
            g = (e.v ** vel) * (1.0 + (rng.uniform(-0.06, 0.06) if human else 0.0))
            p = e.kw.get('pan')
            if p is not None: x = x * np.array([math.cos((p + 1) * math.pi / 4), math.sin((p + 1) * math.pi / 4)]) * 1.414
            add(out, x, max(0.0, t) * SR, g)
        return out
    return play

def synth_kick(f0=160.0, f1=46.0, sweep=0.045, length=0.32, click=0.5, body=1.0):
    """An electronic kick: a sine that falls from f0 to f1, and a click to cut through a small speaker."""
    n = int(length * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / sweep)
    x = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / (length * 0.32)) * body
    c = hp(noise(n, 5), 2500.0) * np.exp(-t / 0.004) * click * 0.5
    c += np.sin(2 * math.pi * 1900 * t) * np.exp(-t / 0.003) * click * 0.4
    return fade(st(drive(x + c, 0.25)), 0.0003, 0.02)
def synth_hat(length=0.06, tone=9000.0, seed=3):
    n = int(length * SR); t = np.arange(n) / SR
    x = hp(noise(n, seed), tone * 0.7, 4) * np.exp(-t / (length * 0.3))
    return fade(st(x), 0.0002, 0.005)
def layer(*parts):
    """Sounds stacked from the same start: (sound, gain), ..."""
    n = max(len(p[0]) for p in parts); out = np.zeros((n, 2))
    for p in parts: add(out, st(p[0]), 0, p[1] if len(p) > 1 else 1.0)
    return out

# ------------------------------------------------------------------ synths
def synth(wave='saw', voices=1, detune=0.1, spread=0.7, sub=0.0, sq=0.0, pw=0.5, cutoff=2400.0, env=0.0,
          fdecay=0.18, res=0.9, track=0.4, a=0.004, d=0.18, s=0.7, r=0.12, dirt=0.0, vib=0.0, vibhz=5.6,
          vibat=0.14, glide=0.045, air=0.0, octave=0, drift=0.0, buzz=0.0, buzzhz=85.0, seed=1):
    """A subtractive synth voice.
    voices/detune/spread: a stack of oscillators, detuned by up to `detune` semitones, fanned across the stereo field.
    sub: a sine an octave down, in the middle. sq: how much square is mixed in with the saw.
    cutoff: the filter in Hz at middle C; env: how many times higher it starts each note, falling over fdecay.
    track: how far the filter follows the pitch. vib: vibrato depth in semitones, starting vibat seconds in.
    A note with slide=<semitones> starts that far off and bends into pitch over `glide` seconds.
    drift: cents each oscillator wanders off pitch, slowly and each its own way (a pad that is not quite well).
    buzz: how deeply the note is chopped at buzzhz, fast enough to be a roughness and not a wobble: a wing."""
    osc = {'saw': saw, 'square': lambda f, n, ph: square(f, n, pw, ph), 'tri': tri, 'sine': sine}[wave]
    def play(evs, n, ctx):
        out = np.zeros((n, 2))
        rng = np.random.default_rng(seed)
        for e in evs:
            env_a = adsr(e.dur, a, d, s, r)
            m = len(env_a); t = np.arange(m) / SR
            p = e.p + 12 * octave
            f = np.full(m, hz(p))
            sl = e.kw.get('slide')
            if sl: f = f * 2.0 ** (sl / 12.0 * np.exp(-t / glide))
            if vib: f = f * 2.0 ** (vib / 12.0 * np.sin(2 * math.pi * vibhz * (ctx['t0'] + e.t + t)) * np.clip((t - vibat) / 0.25, 0, 1))
            L = np.zeros(m); R = np.zeros(m)
            for v in range(voices):
                u = (v / (voices - 1) - 0.5) * 2.0 if voices > 1 else 0.0
                fv = f * 2.0 ** (u * detune / 12.0)
                if drift: fv = fv * 2.0 ** (drift / 1200.0 * np.sin(2 * math.pi * (0.17 + 0.09 * v) * (ctx['t0'] + e.t + t) + 1.7 * v))
                w = osc(fv, m, rng.random())
                if sq: w = w * (1.0 - sq) + square(fv, m, pw, rng.random()) * sq
                ang = (u * spread + 1.0) * math.pi / 4.0
                L += w * math.cos(ang); R += w * math.sin(ang)
            y = np.stack([L, R], 1) / math.sqrt(voices)
            if sub: y += (sine(f * 0.5, m, 0.0) * sub * 0.7)[:, None]
            if air: y += st(hp(noise(m, int(e.t * 1000) + seed), 5000.0)) * air
            base = cutoff * 2.0 ** (track * (p - 60.0) / 12.0)
            fc = np.clip(base * (1.0 + env * np.exp(-t / fdecay)) * e.kw.get('open', 1.0), 30.0, 18000.0)
            y = svf(y, fc, res) * (env_a * e.v)[:, None]
            if buzz: y = y * (1.0 - buzz * (0.5 + 0.5 * np.sin(2 * math.pi * buzzhz * (ctx['t0'] + e.t + t))))[:, None]
            add(out, y, e.t * SR)
        return drive(out, dirt) if dirt else out
    return play

def keys(ratio=3.5, index=2.2, decay=1.4, a=0.002, bright=1.0, trem=0.0, spread=0.35, seed=2):
    """An FM bell or electric piano: one sine bending another, brightest at the strike."""
    def play(evs, n, ctx):
        out = np.zeros((n, 2)); rng = np.random.default_rng(seed)
        for e in evs:
            m = int((e.dur + decay) * SR); t = np.arange(m) / SR
            f = hz(e.p)
            idx = index * bright * e.v * np.exp(-t / (decay * 0.35))
            y = np.sin(2 * math.pi * f * t + idx * np.sin(2 * math.pi * f * ratio * t))
            y += 0.3 * np.sin(2 * math.pi * f * 2.0 * t + 0.5 * idx * np.sin(2 * math.pi * f * t))
            env_a = np.minimum(t / a, 1.0) * np.exp(-t / decay)
            rel = np.clip((e.dur + decay * 0.6 - t) / (decay * 0.4), 0.0, 1.0)
            y = y * env_a * rel * e.v * 0.6
            if trem: y = y * (1.0 - trem * 0.5 * (1 + np.sin(2 * math.pi * 4.3 * (ctx['t0'] + e.t + t))))
            add(out, pan(y, rng.uniform(-spread, spread)), e.t * SR)
        return out
    return play

# ----------------------------------------------------------------- guitars
def guitar(chugs, chords, tight=0.1, wide=0.85, cents=7.0, late=0.011):
    """Rhythm guitar from the raw recordings. chugs and chords: {root MIDI: a sound, or several takes of it}.
    A note's pitch is its root; kind='chug' (default) is a palm mute cut to its length, kind='chord' a power
    chord left to ring for its length. It is double-tracked, one take a side: where the recording has several
    takes the two sides use different ones, as two real passes would; where it has one, the right side is a
    few cents and milliseconds off the left."""
    memo = {}
    def tuned(x, semis):
        key = (id(x), round(semis, 3))
        if key not in memo: memo[key] = shift(st(x), semis)
        return memo[key]
    def play(evs, n, ctx):
        out = np.zeros((n, 2))
        k = int(ctx['t0'] * 13)
        for e in sorted(evs, key=lambda e: e.t):
            is_chord = e.kw.get('kind') == 'chord'
            table = chords if is_chord else chugs
            p = e.p
            while p - max(table) > 3: p -= 12          # out of reach above: play it an octave down
            while min(table) - p > 3: p += 12
            r = min(table, key=lambda r: (abs(r - p), r))
            takes = table[r] if isinstance(table[r], (list, tuple)) else [table[r]]
            a = tuned(takes[k % len(takes)], p - r)
            if len(takes) > 1: b = tuned(takes[(k + len(takes) // 2) % len(takes)], p - r)
            else: b = tuned(takes[0], p - r + cents / 100.0)
            k += 1
            ring = e.kw.get('ring', 0.09 if is_chord else 0.035)
            length = e.dur if is_chord or e.kw.get('open') else min(e.dur, tight)
            a = gate(a, length, ring); b = gate(b, length, ring)
            g = e.v ** 1.3
            add(out, a * np.array([1.0, 1.0 - wide]), e.t * SR, g)
            add(out, b * np.array([1.0 - wide, 1.0]), (e.t + (0.0 if len(takes) > 1 else late)) * SR, g)
        return out
    return play
def amp(x, lows=75.0, highs=6200.0, bite=2.5, dirt=0.3):
    """What a cabinet does to a guitar: no rumble, no fizz, some bite around 2 kHz."""
    return highshelf(lp(peak(hp(drive(x, dirt), lows), 2100.0, bite, 1.2), highs, 4), 4500.0, -1.5)

# ------------------------------------------------------------- ready sounds
def clips(table):
    """Sounds placed whole: a note's `s` names which one."""
    def play(evs, n, ctx):
        out = np.zeros((n, 2))
        for e in evs:
            x = st(table[e.kw['s']])
            if e.kw.get('semi'): x = shift(x, e.kw['semi'])
            if e.kw.get('len'): x = gate(x, e.kw['len'], e.kw.get('rel', 0.05))
            if e.kw.get('lead'): add(out, x, (e.t - e.kw['lead']) * SR, e.v)     # ends on the beat, not starts
            else: add(out, x, e.t * SR, e.v)
        return out
    return play

def riser(secs, lo=250.0, hi=9000.0, tone=None, seed=9):
    """A swell into a downbeat: noise sweeping up, growing; with `tone` (Hz), a rising note under it."""
    n = int(secs * SR); t = np.arange(n) / SR; u = t / secs
    x = svf(noise(n, seed), lo * (hi / lo) ** u, 2.5, 'bp') * u ** 2.2
    if tone:
        f = tone * 2.0 ** (u ** 2 * 1.0)
        x = x + (saw(f, n, 0.0) * 0.25 + saw(f * 1.007, n, 0.3) * 0.25) * u ** 3
    y = st(x)
    y[:, 1] = np.roll(y[:, 1], int(0.007 * SR))
    return fade(y, 0.02, 0.004) * 0.7
def reverse(x, secs=None):
    """A sound played backwards, so it swells up to where it would have started."""
    y = st(x)
    if secs: y = y[:int(secs * SR)]
    return fade(y[::-1].copy(), 0.05, 0.003)
def tapestop(x, at, secs=0.6, curve=1.5):
    """A tape machine switched off under a sound: from `at` seconds in it plays slower and lower, and
    stands still `secs` later. What is left of the sound after that is never heard."""
    x = st(x); i0 = min(int(at * SR), len(x) - 2); n = int(secs * SR)
    u = np.arange(n) / n
    pos = i0 + np.cumsum((1.0 - u) ** curve)
    pos = pos[pos < len(x) - 1]
    k = pos.astype(int); f = (pos - k)[:, None]
    tail = (x[k] * (1.0 - f) + x[k + 1] * f) * (1.0 - u[:len(pos)] ** 3)[:, None]
    return np.concatenate([x[:i0], tail])
def boom(f0=95.0, f1=32.0, secs=2.2, body=1.0, crack=0.5, seed=4):
    """An impact that a laptop can play too: a falling sine for the big speakers, a dull thud and a crack of
    noise above it for the small ones."""
    n = int(secs * SR); t = np.arange(n) / SR
    f = f1 + (f0 - f1) * np.exp(-t / 0.09)
    sub = np.sin(2 * math.pi * np.cumsum(f) / SR) * np.exp(-t / (secs * 0.28)) * body
    thud = lp(noise(n, seed), 420.0, 4) * np.exp(-t / 0.16) * 1.6
    snap = bp(noise(n, seed + 1), 900.0, 5200.0) * np.exp(-t / 0.035) * crack
    y = st(drive(sub + thud, 0.5)) + st(snap)
    y[:, 1] = y[:, 1] * 0.92 + np.roll(y[:, 0], 23) * 0.08
    return fade(y, 0.0003, 0.2)

# ------------------------------------------------------- pitched recordings
def sampler(table, rel=0.08, vel=1.3, pre=0.0, width=1.0):
    """A recorded instrument played at any pitch: {root MIDI (fractions allowed, for a recording that is
    a little sharp or flat): sound}. Each note takes the nearest recording, replays it faster or slower
    to reach the pitch, and holds it for the note's length. pre: seconds of the recording's own attack
    that come before the beat (a horn that swells in), so its weight lands on the note."""
    memo = {}
    def play(evs, n, ctx):
        out = np.zeros((n, 2))
        for e in evs:
            r = min(table, key=lambda r: (abs(r - e.p), r))
            key = (r, round(e.p - r, 3))
            if key not in memo: memo[key] = shift(st(table[r]), e.p - r)
            x = gate(memo[key], e.dur + pre, e.kw.get('rel', rel))
            if width != 1.0: x = widen(x, width)
            add(out, x, (e.t - pre) * SR, e.v ** vel)
        return out
    return play

def steam(secs=0.35, lo=2500.0, hi=9000.0, seed=6):
    """A valve letting go: a burst of hiss that opens fast and thins as it dies."""
    n = int(secs * SR); t = np.arange(n) / SR
    x = svf(noise(n, seed), hi - (hi - lo) * (t / secs) ** 0.5, 1.2, 'bp') * np.minimum(t / 0.006, 1.0) * np.exp(-t / (secs * 0.3))
    y = st(x); y[:, 1] = np.roll(y[:, 1], 31)
    return fade(y, 0.001, 0.02)

def skitter(tone=4200.0, spread=0.9, seed=5):
    """Legs. Each note is a burst of tiny taps across its length: n of them (default 8), quickening
    (curve under 1) or slowing (over 1), each a few milliseconds of something hard on something hollow,
    each somewhere else between the speakers. A note's pitch moves the whole burst up or down."""
    def play(evs, n, ctx):
        out = np.zeros((n, 2)); rng = np.random.default_rng(seed + int(ctx['t0'] * 100))
        for e in evs:
            k = int(e.kw.get('n', 8)); curve = e.kw.get('curve', 1.0)
            for i in range(k):
                t = e.t + (i / k) ** curve * e.dur + rng.uniform(-0.004, 0.004)
                m = int(rng.uniform(0.003, 0.009) * SR); tt = np.arange(m) / SR
                f = tone * 2.0 ** rng.uniform(-0.6, 0.6) * 2.0 ** ((e.p - 60.0) / 12.0)
                tap = np.sin(2 * math.pi * f * tt + rng.uniform(0, 6.28)) * np.exp(-tt / (m / SR * 0.3))
                tap += rng.standard_normal(m) * 0.3 * np.exp(-tt / 0.001)
                add(out, pan(tap, rng.uniform(-spread, spread)), max(0.0, t) * SR, e.v * rng.uniform(0.45, 1.0))
        return out
    return play
