"""The recorded effects (MUSIC-PLAN.md): builds sfx/*.opus and sfx/manifest.json from the raw
recordings in music-src/ and some synthesis.

  python studio/sfx.py            all of them
  python studio/sfx.py shoot hit  only these

Each effect is a function returning its takes (the game picks one at random, never the same twice
running, and nudges its pitch) and how it sits in the manifest: `vol`, its level against the synth it
replaces, and `pitch`, how far a take may be nudged either way. An effect heard hundreds of times a
minute is short, mono and has several takes; one heard now and then can be long and wide.
"""
import os, sys, json, glob, math
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from daw import (SR, ROOT, st, add, fit, fade, hp, lp, bp, peak, highshelf, svf, saw, sine, noise, shift, sample, reverb,
                 echo, clip, lin, dbfs, write_opus, digest, hz)
from inst import keys, layer
from daw import Ev

SFX = os.path.join(ROOT, 'sfx')
OUT = os.path.join(ROOT, 'music-src', 'out')

def norm(x, peak_db=-1.0): return x / max(1e-9, float(np.abs(x).max())) * lin(peak_db)
def mono(x): return st(x).mean(axis=1)
def env_exp(n, tau): return np.exp(-np.arange(n) / (tau * SR))

def shoot():
    """VOIDRUNNER's shot: a laser rifle's crack, lightened, over the pew the first build had."""
    takes = []
    for src, semi, f0 in [('ESM_GW_laser_rifle_short_2', 2.0, 1700.0), ('ESM_GW_laser_rifle_short_3', 4.0, 1900.0),
                          ('ESM_GW_laser_rifle_short_2', 0.5, 1550.0)]:
        n = int(0.15 * SR); t = np.arange(n) / SR
        crack = fit(mono(hp(lp(shift(sample(src), semi), 5500.0, 4), 250.0, 4)), n) * env_exp(n, 0.04)
        f = 300.0 + (f0 - 300.0) * np.exp(-t / 0.03)
        pew = (np.sin(2 * math.pi * np.cumsum(f) / SR) * 0.7 + saw(f, n) * 0.3) * env_exp(n, 0.032)
        takes.append(norm(fade(crack / np.abs(crack).max() * 0.6 + pew * 0.65, 0.0003, 0.02)))
    return takes, dict(vol=0.28, pitch=0.05)

def hit():
    """A shot landing: a tick of struck metal, short enough to be heard a hundred times and not noticed."""
    takes = []
    for src, semi, seed in [('ESM_GB_metal_heavy_impact_01', 7.0, 1), ('ESM_GB_metal_heavy_impact_02', 9.0, 2), ('ESM_GB_metal_heavy_impact_01', 4.0, 3)]:
        n = int(0.085 * SR)
        metal = fit(mono(hp(lp(shift(sample(src), semi), 5000.0, 4), 450.0, 4)), n) * env_exp(n, 0.016)
        tick = bp(noise(n, seed), 1000.0, 3500.0) * env_exp(n, 0.007)
        takes.append(norm(fade(metal / np.abs(metal).max() * 0.8 + tick / np.abs(tick).max() * 0.45, 0.0002, 0.015)))
    return takes, dict(vol=0.16, pitch=0.07)

def lance():
    """EMBER's lance: a beam that stands for a second, fired again as soon as it goes out, so it is heard
    about once a second for a whole fight. (The first one, a 5 kHz zap into a hard-synced buzz, was
    tiring on repeat, 14 Oct: "the new one sucks".)

    Made from a designed blaster beam (two takes of one, in its low variant): its strike, then its body,
    warm (half of it under 250 Hz) and with no pitch of its own, so it sits under any song's key.
    As recorded, the body only arrives a fifth of a second after the strike, and it swells and dips three
    to five times a second. Here the strike runs straight into the body, the body is levelled sample by
    sample (no swell left in it, so it is a beam and not a wave), and it is then shaped the way the beam
    on screen is: a little under full as it opens, full in the middle, easing as it narrows. It ends
    with the recording's own shut-off and a short fizz of what it left in the air."""
    from scipy.ndimage import uniform_filter1d
    takes = []
    for src, hit_src, semi in [('ESM_GW_blaster_beam_low_1', 'ESM_GW_blaster_beam_low_1', 0.0),
                               ('ESM_GW_blaster_beam_low_2', 'ESM_GW_blaster_beam_low_2', 0.0),
                               ('ESM_GW_blaster_beam_low_1', 'ESM_GW_blaster_beam_low_2', -1.2)]:
        x = shift(sample(src), semi); h = shift(sample(hit_src), semi)
        k = 2.0 ** (-semi / 12.0)                                   # a lower take is longer: its times stretch with it
        on = int(0.05 * SR)                                         # where the body comes in, after the strike
        strike = fade(h[:int(0.075 * k * SR)], 0.0003, 0.025)
        # for a speaker that has no bass, and for an ear that hears it a thousand times: nothing under 90 Hz, a
        # little less of the 3 kHz bite and of the top. Before the levelling, since part of the swell is in the bass
        eq = lambda y: highshelf(peak(hp(y, 90.0, 2), 3000.0, -2.5, 0.8), 6500.0, -3.0)
        strike = eq(strike)
        body = eq(x[int(0.24 * k * SR):int(1.2 * k * SR)].copy())
        # levelled: its loudness over 40 ms, divided out, so the slow swell goes and the grain stays
        lev = np.sqrt(uniform_filter1d(body.mean(axis=1) ** 2, size=int(0.04 * SR), mode='nearest'))
        body *= np.clip(float(np.median(lev)) / np.maximum(lev, 1e-9), 0.5, 2.0)[:, None]
        n = len(body); t = np.arange(n) / SR
        shape = (0.78 + 0.22 * np.sin(np.pi * np.clip(t / (n / SR), 0, 1)) ** 0.7) * np.minimum(t / 0.03, 1.0)
        body = body * shape[:, None]
        body[-int(0.03 * SR):] *= np.linspace(1, 0, int(0.03 * SR))[:, None]
        # the shut-off: the recording's own release, the sparkle after it kept short and dulled
        tail = x[int(1.2 * k * SR):int(1.55 * k * SR)].copy()
        tail = eq(lp(tail, 6000.0, 2)) * np.exp(-np.arange(len(tail)) / (0.09 * SR))[:, None]
        tail[:int(0.03 * SR)] *= np.linspace(0, 1, int(0.03 * SR))[:, None]
        out = np.zeros((on + n + len(tail), 2))
        add(out, strike, 0, 1.0)
        add(out, body, on, 0.85)
        add(out, tail, on + n - int(0.03 * SR), 0.85)
        # narrower than recorded: a weapon, in the middle
        m = out.mean(axis=1, keepdims=True); out = m + (out - m) * 0.7
        takes.append(norm(fade(out, 0.0003, 0.05)))
    return takes, dict(vol=0.3, pitch=0.025)

def codex():
    """The codex opening: a hardcover's weight, a page, air, and three bell notes that do not resolve."""
    n = int(2.6 * SR); out = np.zeros((n, 2)); wet = np.zeros((n, 2))
    book = lp(sample('BookHardcover_S08FO'), 6000.0)[:int(0.7 * SR)]
    page = hp(sample('HardcoverBookPage_BW'), 700.0)
    air = sample('ESM_PG_magic_airy_whoosh_swell_03')[:int(1.7 * SR)]
    add(out, fade(book, 0.001, 0.1), 0, 0.9)
    add(out, page, 0.1 * SR, 0.8); add(wet, page, 0.1 * SR, 0.3)
    add(out, fade(air, 0.01, 0.5), 0.05 * SR, 0.4); add(wet, fade(air, 0.01, 0.5), 0.05 * SR, 0.3)
    bell = keys(ratio=3.5, index=1.6, decay=0.9, spread=0.5)
    notes = [Ev(0.16, 0.3, 69, 0.8), Ev(0.25, 0.3, 76, 0.75), Ev(0.34, 0.5, 83, 0.9)]      # A4, E5, B5: open, unresolved
    b = bell(notes, n, dict(t0=0.0))
    add(out, b, 0, 0.5); add(wet, b, 0, 0.6)
    x = out + reverb(wet, decay=1.6, pre=0.01, bright=7000.0, dark=2000.0)
    env = np.abs(x).max(axis=1); live = np.nonzero(env > lin(-60.0) * env.max())[0]
    return [norm(fade(x[:int(live[-1]) + 1], 0.001, 0.2))], dict(vol=0.3, pitch=0.015)

EFFECTS = {'shoot': shoot, 'hit': hit, 'lance': lance, 'codex': codex}

def build(names):
    os.makedirs(SFX, exist_ok=True); os.makedirs(OUT, exist_ok=True)
    p = os.path.join(SFX, 'manifest.json')
    man = json.load(open(p, encoding='utf-8')) if os.path.exists(p) else {'v': 1, 'sfx': {}}
    import soundfile as sf
    for name in names:
        takes, how = EFFECTS[name]()
        for old in glob.glob(os.path.join(SFX, name + '-*.opus')): os.remove(old)
        files, size = [], 0
        for k, x in enumerate(takes):
            x = np.asarray(x, dtype=np.float64)
            f = f'{name}-{k + 1}-{digest(x)}.opus'
            write_opus(os.path.join(SFX, f), x, 0.8)
            size += os.path.getsize(os.path.join(SFX, f)); files.append(f)
            sf.write(os.path.join(OUT, f'sfx-{name}-{k + 1}.wav'), x.astype(np.float32), SR)
        man['sfx'][name] = dict(f=files, **how)
        x = takes[0]; m = st(x)
        rms = dbfs(math.sqrt(float((m ** 2).mean())))
        P = np.abs(np.fft.rfft(m.mean(axis=1))) ** 2
        cen = float((P * np.fft.rfftfreq(len(m), 1 / SR)).sum() / max(1e-20, P.sum()))
        print(f"{name:7s} {len(takes)} take(s), {len(x) / SR:.2f}s, {'stereo' if np.ndim(x) == 2 else 'mono'}, rms {rms:.1f} dBFS, "
              f"centre {cen:.0f} Hz, {size / 1000:.0f} KB, vol {how['vol']}, pitch ±{how['pitch']}")
    with open(p, 'w', encoding='utf-8', newline='\n') as f:
        json.dump(man, f, indent=1); f.write('\n')

if __name__ == '__main__':
    build([a for a in sys.argv[1:] if a in EFFECTS] or list(EFFECTS))
