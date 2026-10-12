"""corrupt: the corrupted OTHER (MUSIC-PLAN.md). "Instead of taking the mirrors, something takes it":
a full heal, armour, the rage sequence run at speed. So this is Your Reflection with something else in
it. The same band, faster, and one note of the scale has gone bad: every B is a B flat, which turns
A minor into the mode a semitone darker and gives it a chord (B flat) that leans on the home note from
just above. The leads are crushed to a few bits, a low voice that was not there before doubles them
from underneath, the hi-hats are noise, and notes stick twice as often. 176 BPM, A minor with a B flat.

  intro  2 bars, once  something else gets in: the theme's first three notes, the third one sticking
                       and the tape under it switched off; a breath; a roll
  v1     16 bars       the theme, corrupted: B flat for B, and the chords that makes (G minor, B flat)
  v2     16 bars       its own tune, corrupted the same way: where it used to reach E major it finds
                       B flat instead; four bars out and the same four back, as before

The game holds the corrupted OTHER in its last phase, so both sections answer to any phase and follow
each other round.
"""
import numpy as np
from daw import Song, Bus, Ev, SR, chord, midi, hp, highshelf, clip, crush
from inst import hit, synth, clips, riser, boom, tapestop
from scores._common import THEME, third, kit, tomfill, riff, retro
from scores.other import kit_for, stuck, last_note, until, OWN, BASS, GTR

TITLE = 'Your Reflection (Corrupted)'
ORDER = ['intro', 'v1', 'v2', 'v1']

def sour(text):
    """A line with its B gone bad: every B a B flat."""
    out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        if name == 'r': out.append(tok); continue
        m = int(midi(name.rstrip('!')))
        out.append(f'{m - 1 if m % 12 == 11 else m}:{d}')
    return ' '.join(out)

CT = [sour(t) for t in THEME]
CT_CH = ['Am', 'Am', 'Gm', 'C', 'Am', 'Bb', 'F', 'Gm']
COWN = [sour(t) for t in OWN[:3]] + ['D5:4 F5:4 Bb5:8']          # the fourth bar used to climb E major
COWN_CH = ['Am', 'Dm', 'Gm', 'Bb']
LOW = dict(BASS, Gm='G2', Bb='Bb2'); CHUG = dict(GTR, Gm='G2', Bb='Bb2')

def song():
    K = kit()
    beat = 60.0 / 176
    s = Song('corrupt', 176, target=-10.0, ceil=-2.0, room=dict(decay=1.8, pre=0.012, bright=6000.0, dark=1500.0),
             echo=dict(time=beat * 0.75, fb=0.4, taps=5), master=lambda x: highshelf(hp(x, 32.0), 8800.0, -2.0))
    M = kit_for(s, crushed=lambda x: crush(x, 6, 4))                  # the same band; the leads through a few bits
    # the thing underneath: it doubles the tune from two octaves down, and was never in the first song
    s.add('under', Bus(synth('square', pw=0.4, voices=2, detune=0.2, spread=0.2, sub=0.5, cutoff=900.0, env=1.5, fdecay=0.15, res=1.2, a=0.004,
                             d=0.15, s=0.8, r=0.08, dirt=1.0), gain=0.17, rev=0.1, duck=0.3, fx=[lambda x: hp(crush(x, 5, 6), 60.0)]))
    s.add('hiss', Bus(hit(K['hats'], human=0.002), gain=0.9, fx=[lambda x: hp(crush(x, 4, 7), 1500.0)]))      # hi-hats, through three bits
    lead = synth('saw', voices=3, detune=0.11, spread=0.3, sq=0.3, cutoff=2700.0, a=0.006, d=0.2, s=0.8, r=0.13)
    n = int(2.2 * SR)
    stop = tapestop(lead([Ev(0.0, 1.8, midi(p), 0.9) for p in ('A3', 'E4', 'A4', 'C5')], n, dict(t0=0.0)), 0.05, 0.9)
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'short': riser(s.bar, lo=500.0), 'smash': M['smash'], 'unsmash': M['unsmash'],
                           'debris': M['debris'], 'stop': crush(stop / max(1e-9, float(np.abs(stop).max())), 6, 4)}),
                    gain=1.0, rev=0.2, fx=[lambda x: clip(x, 0.8)]))

    def roll(sec, bar, sym, last=16):
        r = midi(LOW[sym])
        for k in range(last): sec.note('bass', bar, k, 0.9, r + (12 if k % 4 == 2 else 0), 1.0 if k % 4 == 0 else 0.8)
    def pad(sec, bar, sym, v=1.0):
        sec.chordn('pad', bar, 0, 15.5, sym, 3, v * 1.3)
    def tune(sec, bar, text, catch, v=1.0, high=False):
        """The tune on the crushed lead, the thing underneath doubling it; on a caught bar the last beat sticks."""
        line = until(text, 12) if catch else text
        sec.line('you', bar, line, v); sec.line('it', bar, line, v, octave=1 if high else 0)
        sec.line('under', bar, line, 0.9, octave=-2)
        if catch:
            p = last_note(line); stuck(sec, bar, p, buses=('you',)); stuck(sec, bar, p + (12 if high else 0), buses=('it',))
            stuck(sec, bar, p - 24, n=4, buses=('under',))
    def band(sec, bar, sym, catch, back=False):
        last = 12 if catch else 16; g = CHUG[sym]
        roll(sec, bar, sym, last); pad(sec, bar, sym, 0.9)
        if not catch: riff(sec, bar, ' '.join(f'{g}*:2 {g}:1 {g}:1' for _ in range(4)) if not back else ' '.join(f'{g}:1 {g}:1 {g}*:2' for _ in range(4)), bass=False)
        else: riff(sec, bar, ' '.join(f'{g}*:2 {g}:1 {g}:1' for _ in range(3)), bass=False)
        sec.hits('kick', bar, ('x..x..x...x..x..' if not back else 'x..x..x...x.x...') if not catch else 'x..x..x...x.xxxx')
        sec.hits('snare', bar, '....x..-.-..x...' if not catch else '....x..-........')
        sec.hits('hiss', bar, 'xoxoxoxoxoxoxoxo' if not catch else 'xoxoxoxoxoxo....', v=0.9)

    # ---- intro: something else gets in
    i = s.section('intro', 2, seg=2, loop=False, next='v1', lock=True)
    i.line('you', 0, 'A4:2 C5:2', 0.9); stuck(i, 0, midi('E5'), at=4, n=8, v=0.9, buses=('you',))
    i.note('fx', 0, 4, 12, 60, 0.4, s='stop'); i.line('under', 0, 'r:8 A2:8', 0.8)
    i.note('fx', 0, 0, 1, 60, 0.3, s='smash'); i.note('fx', 0, 0, 1, 60, 0.22, s='boom')
    i.note('under', 1, 0, 14, midi('Bb2'), 0.9)                       # the first thing it says is the wrong note
    for k in range(16): i.note('snare', 1, k, 1, 60, 0.25 + 0.045 * k)
    i.note('fx', 1, 0, 16, 60, 0.3, s='short'); tomfill(i, 1, 12)

    # ---- v1: the theme, corrupted
    a = s.section('v1', 16, seg=2, next='v2')
    for b in range(16):
        k = b % 8; sym = CT_CH[k]; catch = b % 2 == 1 and k != 7
        band(a, b, sym, catch); tune(a, b, CT[k], catch, high=b >= 8)
    for b in (0, 8): a.note('fx', b, 0, 1, 60, 0.3, s='debris'); a.note('fx', b, 0, 1, 60, 0.2, s='boom')
    a.note('fx', 7, 8, 8, 60, 0.3, s='stop'); tomfill(a, 15, 8); a.hits('snare', 15, '........x.x.xxxx', v=0.9)

    # ---- v2: its own tune, corrupted: four bars out and the same four back
    c = s.section('v2', 16, seg=2, next='v1')
    for b in range(16):
        n8 = b % 8; back = n8 >= 4; k = n8 if not back else 7 - n8; sym = COWN_CH[k]; catch = n8 in (3, 7)
        text = COWN[k] if not back else retro(COWN[k])
        band(c, b, sym, catch, back); tune(c, b, text, catch, high=b >= 8)
        if b >= 8 and not catch: c.line('you', b, third(text, 'A'), 0.4, octave=-1)
    for b in (0, 8): c.note('fx', b, 0, 1, 60, 0.3, s='debris'); c.note('fx', b, 0, 1, 60, 0.2, s='boom')
    for b in (4, 12): c.note('fx', b, 0, 1, 60, 0.26, s='smash')
    c.note('fx', 15, 8, 8, 60, 0.3, s='stop'); tomfill(c, 15, 8)

    s.moods = {'p1': ['v1', 'v2']}
    s.start = 'intro'
    return s
