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
    """EMBER's lance: a laser. A zap that falls from 5 kHz in a few hundredths of a second, then a tight,
    steady beam (a hard-synced oscillator: one bright buzzing pitch, nothing wavering) that holds for the
    beam's second, drains a little, and drops away as it shuts off."""
    from scipy.signal import resample_poly
    takes = []
    for semi, seed in [(0.0, 1), (-2.0, 2)]:
        n = int(1.2 * SR); t = np.arange(n) / SR; k = 2.0 ** (semi / 12.0)
        out = np.zeros((n, 2))
        # the zap
        fz = 900.0 * k + 4300.0 * k * np.exp(-t / 0.03)
        zap = (np.sin(2 * math.pi * np.cumsum(fz) / SR) * 0.6 + saw(fz, n) * 0.4) * np.exp(-t / 0.06)
        # the beam, made four times oversampled so the sync's edges do not alias
        OS = 4; to = np.arange(n * OS) / (SR * OS)
        f0 = 392.0 * k
        ratio = np.where(to < 1.0, 4.3 + 0.7 * (1.0 - to) + 4.0 * np.exp(-to / 0.045), 4.3 * np.exp(-(to - 1.0) / 0.09) + 1.0)
        pm = (f0 * to) % 1.0
        beam = resample_poly(2.0 * ((pm * ratio) % 1.0) - 1.0, 1, OS)[:n]
        beam = beam + 0.35 * np.sin(2 * math.pi * f0 * 4.0 * t)                      # a pure whine on top
        beam = lp(hp(beam, 300.0), 5500.0, 4)
        hiss = bp(noise(n, seed), 4500.0, 9000.0) * 0.05
        shape = np.minimum(t / 0.004, 1.0) * np.where(t < 1.0, 1.0 - 0.15 * t, 0.85 * np.exp(-(t - 1.0) / 0.05))
        crack = hp(shift(sample('ESM_GW_laser_pistol_heavy_beefy_2'), 4.0 + semi), 400.0)[:int(0.12 * SR)]
        add(out, st(zap), 0, 0.55)
        add(out, st((beam * 0.5 + hiss) * shape), 0, 0.6)
        add(out, crack * np.exp(-np.arange(len(crack)) / (0.03 * SR))[:, None], 0, 0.35)
        out[:, 1] = np.roll(out[:, 1], 9)                                             # a hair of width, no detune (detune beats)
        takes.append(norm(fade(out, 0.0003, 0.03)))
    return takes, dict(vol=0.26, pitch=0.02)

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
