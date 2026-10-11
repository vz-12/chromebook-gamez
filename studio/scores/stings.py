"""The stings (MUSIC-PLAN.md): short pieces the game plays over the music at a moment, not on a bar line.

  boss-in   a boss arrives: an alarm of brass, toms and a riser climbing for a second and a half, then
            the hit. The game starts the boss's track on that hit (`hit`, in seconds).

Each maker returns (stereo sound, when it lands or None).
"""
import numpy as np
from daw import SR, st, add, fit, hp, lp, highshelf, reverb, clip, clip_gain, limit_gain, lin, dbfs, shift, gate, fade
from inst import riser, reverse, boom
from scores._common import kit

def _master(x, peak_db=-2.0):
    """A sting's own master: its loudest moment pushed into the clipper, then held under the ceiling."""
    x = highshelf(hp(x, 32.0), 8500.0, -2.0)
    x = x / max(1e-9, float(np.abs(x).max())) * lin(peak_db + 5.0)
    x = x * clip_gain(x, knee_db=peak_db - 6.0, ceil_db=peak_db + 0.5)[:, None]
    return x * limit_gain(x, ceil_db=peak_db)[:, None]

def boss_in():
    K = kit()
    HIT = 1.5
    n = int(5.2 * SR); dry = np.zeros((n, 2)); wet = np.zeros((n, 2))
    def put(x, t, g=1.0, send=0.2):
        add(dry, st(x), t * SR, g); add(wet, st(x), t * SR, g * send)
    put(K['brass'], 0.0, 0.42, 0.35)                                   # the alarm
    put(riser(HIT, lo=200.0, hi=8000.0, tone=110.0), 0.0, 0.75, 0.2)
    put(reverse(K['crash'], 1.3), HIT - 1.3, 0.4, 0.3)
    for i, (t, semi) in enumerate([(0.0, -5), (0.56, 0), (0.84, 0), (1.03, 2), (1.17, 2), (1.27, 7), (1.35, 7), (1.42, 7)]):
        put(shift(K['tom_mid'], semi) if semi else K['tom_mid'], t, 0.32 + 0.05 * i, 0.25)
    # the hit: a thud a laptop can play, the sub for speakers that can, cymbals, the snare, a choir rising out of it
    put(boom(secs=2.4, crack=1.2), HIT, 0.7, 0.15)
    put(lp(K['sub1'], 120.0), HIT, 0.25, 0.0)
    put(K['crash'], HIT, 0.6, 0.35); put(K['china'], HIT, 0.4, 0.3)
    put(clip(K['snare_m'], 0.7), HIT, 0.85, 0.4)
    put(clip(K['kick_m'], 0.7), HIT, 0.7, 0.1)
    put(gate(K['choir'], 1.5, 0.5), HIT, 0.4, 0.6)
    x = dry + reverb(wet, decay=2.4, pre=0.02, bright=6000.0, dark=1500.0)
    x = _master(x, -2.0)
    env = np.abs(x).max(axis=1); live = np.nonzero(env > lin(-66.0))[0]
    x = fade(x[:int(live[-1]) + 1], 0.002, 0.15)
    return x, HIT

STINGS = {'boss-in': boss_in}
