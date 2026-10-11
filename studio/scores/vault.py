"""vault: THE VAULT, sector 04 (MUSIC-PLAN.md). Cold and crystalline, and locked: a kitchen timer's
ticks keep the time lock, a lock's clicks fall between them, sung bowls hold the chords, a plucked
zither runs the arpeggios and glass bells carry a tune that moves like a dial being turned, one
click at a time. 118 BPM, B minor.

  intro  4 bars, once     a bowl struck in the dark, the ticking, the first clicks, a mechanism winding
  a      16 bars, calm    the time lock and the bowls; the tune's first notes, then all of it, on glass
  b      16 bars, fight   the alarm: the tune on a lead with the bells above it, the chords chopped
                          into a lattice of sixteenths, kettledrums on the corners
  c      16 bars, fight   the lattice closing: the answer climbs in running arpeggios over a half-time
                          beat; falls back into b

Nearest reference: Hadopelagic Pressure (cold, sub-heavy, with room in it).
"""
import math
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, gate
from inst import hit, synth, keys, sampler, clips, riser, reverse, boom
from scores._common import third, kit, vault, tomfill

TITLE = 'Time Lock'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the tune: a bar a line. A quarter, two eighths, two quarters: a dial turned and let settle
DIAL = ['F#5:4 D5:2 B4:2 C#5:4 D5:4',
        'F#5:4 D5:2 B4:2 A4:4 B4:4',
        'G5:4 D5:2 B4:2 C#5:4 D5:4',
        'G5:4 E5:2 D5:2 B4:8',
        'E5:4 B4:2 G4:2 A4:4 B4:4',
        'E5:4 G5:2 B5:2 A5:8',
        'F#5:4 C#5:2 A#4:2 B4:4 C#5:4',
        'F#5:4 A#5:2 C#6:2 F#5:8']
DIAL_CH = ['Bm', 'Bm', 'G', 'G', 'Em', 'Em', 'F#', 'F#']
# its answer: the same chords' notes run upward in eighths, a lattice instead of a dial
GRID = ['B4:2 D5:2 G5:2 D5:2 B5:4 A5:2 G5:2',
        'C#5:2 E5:2 A5:2 E5:2 C#6:4 B5:2 A5:2',
        'D5:2 F#5:2 B5:2 F#5:2 D6:8',
        'C#6:2 B5:2 F#5:2 D5:2 B4:8',
        'B4:2 D5:2 G5:2 D5:2 B5:4 A5:2 G5:2',
        'C#5:2 E5:2 A5:2 E5:2 E6:4 C#6:2 A5:2',
        'A#5:8 C#6:4 F#6:4',
        'F#6:2 E6:2 C#6:2 A#5:2 F#5:2 E5:2 C#5:2 A#4:2']
GRID_CH = ['G', 'A', 'Bm', 'Bm', 'G', 'A', 'F#', 'F#']
BASS = {'Bm': 'B1', 'G': 'G1', 'Em': 'E2', 'F#': 'F#1', 'A': 'A1', 'D': 'D2'}

def song():
    K = kit(); V = vault()
    s = Song('vault', 118, target=-12.0, ceil=-1.5, room=dict(decay=3.0, pre=0.03, bright=8000.0, dark=2400.0),
             master=lambda x: hp(x, 30.0))
    s.add('kick', Bus(hit(K['kick_e']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(K['snare_w']), gain=0.6, rev=0.18, fx=[lambda x: clip(x, 0.7)]))
    s.add('tick', Bus(hit(V['tick'], human=0.0015), gain=0.56, rev=0.1, fx=[lambda x: hp(x, 1500.0)]))
    s.add('lock', Bus(hit(V['lock']), gain=0.6, rev=0.22, dly=0.2, fx=[lambda x: hp(x, 500.0)]))
    s.add('ratchet', Bus(hit(V['ratchet']), gain=0.4, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.2, rev=0.3, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.5, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.5), gain=0.5, rev=0.25, fx=[lambda x: clip(x, 0.8)]))
    s.add('bass', Bus(synth('saw', voices=1, sq=0.25, cutoff=330.0, env=2.2, fdecay=0.16, res=0.9, track=0.35, a=0.008, d=0.2,
                            s=0.85, r=0.1, dirt=0.5, octave=1),
                      gain=0.3, duck=0.5, fx=[lambda x: peak(hp(x, 40.0), 600.0, 2.5, 1.0)]))
    s.add('bowl', Bus(sampler(V['bowl'], rel=1.2), gain=0.27, rev=0.45, duck=0.25, fx=[lambda x: hp(x, 90.0)]))
    s.add('hbowl', Bus(sampler(V['hbowl'], rel=1.5), gain=0.38, rev=0.6, fx=[lambda x: hp(x, 250.0)]))
    s.add('harp', Bus(sampler(V['harp'], rel=0.3), gain=0.6, dly=0.35, rev=0.35, fx=[lambda x: hp(x, 250.0)]))
    s.add('glass', Bus(keys(ratio=3.5, index=1.4, decay=1.5, spread=0.5), gain=0.3, dly=0.3, rev=0.5, fx=[lambda x: hp(x, 300.0)]))
    s.add('grid', Bus(synth('square', pw=0.18, voices=2, detune=0.06, spread=0.8, cutoff=3000.0, env=0.6, fdecay=0.05, a=0.002,
                            d=0.05, s=0.55, r=0.03), gain=0.2, rev=0.2, duck=0.2, fx=[lambda x: hp(x, 400.0)]))
    s.add('lead', Bus(synth('saw', voices=3, detune=0.1, spread=0.45, sq=0.3, cutoff=2900.0, env=1.2, fdecay=0.22, a=0.006, d=0.2,
                            s=0.8, r=0.13, vib=0.1, dirt=0.15), gain=0.22, dly=0.3, rev=0.3, duck=0.12, fx=[lambda x: hp(x, 250.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.16, spread=1.0, cutoff=1500.0, track=0.2, a=0.5, d=0.5, s=0.9, r=0.6),
                     gain=0.16, rev=0.55, duck=0.4, fx=[lambda x: hp(x, 320.0)]))
    s.add('fx', Bus(clips({'boom': boom(), 'riser': riser(2 * s.bar, lo=400.0, hi=9000.0), 'short': riser(s.bar, lo=700.0),
                           'rev': reverse(K['crash'], 1.6), 'shatter': V['shatter'], 'tinkle': V['tinkle'], 'ice': V['ice'],
                           'ding': V['ding']}), gain=1.0, rev=0.3, fx=[lambda x: clip(x, 0.8)]))

    def bed(sec, bar, sym, v=1.0, high=None):
        """The bowls: the chord's root and fifth sung low, and now and then a small bowl above."""
        r = midi(BASS[sym]) + 24
        while r > 55: r -= 12
        sec.note('bowl', bar, 0, 15.5, r, v); sec.note('bowl', bar, 0, 15.5, r + 7 if r + 7 <= 57 else r - 5, v * 0.7)
        if high: sec.note('hbowl', bar, 0, 15.5, midi(high), v * 0.9)
        sec.chordn('pad', bar, 0, 15.5, sym, 4, v)
    def bass(sec, bar, sym, mode):
        r = midi(BASS[sym])
        if mode == 'long': sec.note('bass', bar, 0, 11, r, 0.7); sec.note('bass', bar, 12, 3.5, r + 12, 0.55)
        elif mode == 'drive':
            for i in range(8): sec.note('bass', bar, i * 2, 1.7, r + (12 if i in (3, 7) else 0), 1.0 if i % 2 == 0 else 0.82)
        else: sec.note('bass', bar, 0, 6, r, 1.0); sec.note('bass', bar, 6, 2, r, 0.8); sec.note('bass', bar, 8, 7.5, r, 0.95)
    def arp(sec, bar, sym, every=2, v=0.7):
        tones = chord(sym, 4) + chord(sym, 5)
        order = [0, 2, 1, 3, 2, 4, 3, 5] if every == 2 else [0, 1, 2, 3, 4, 5, 4, 3, 2, 3, 4, 5, 4, 3, 2, 1]
        for i, k in enumerate(order): sec.note('harp', bar, i * every, every, tones[k], v * (1.0 if i % 4 == 0 else 0.8))
    def lattice(sec, bar, sym, v=0.8, pattern='x.xx.x.xx.xx.x.x'):
        """The chord chopped into sixteenths: the lasers."""
        for i, ch in enumerate(pattern):
            if ch == 'x':
                for m in chord(sym, 4): sec.note('grid', bar, i, 0.8, m, v * (1.0 if i % 4 == 0 else 0.8))
    def wind(sec, bar, at=8, n=16, v=0.9):
        """A mechanism winding up to the bar line."""
        for i in range(n): sec.note('ratchet', bar, at + i * (16 - at) / n, 0.5, 60, v * (0.4 + 0.6 * i / n))
    HIGH = {'Bm': 'B4', 'G': 'B4', 'Em': 'B4', 'F#': 'C#5', 'A': 'C#5'}
    def tp(sym):
        """A kettledrum on the chord's root, in the octave the drums were recorded near."""
        r = midi(BASS[sym]); return r if r >= 38 else r + 12

    # ---- intro: a bowl struck in the dark, the lock starting to count
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    for b in range(4): bed(i, b, 'Bm', 0.7 + 0.08 * b, 'B4' if b in (0, 2) else None)
    i.note('fx', 0, 0, 1, 60, 0.3, s='shatter'); i.note('bass', 0, 0, 30, midi('B1'), 0.6, open=0.6); i.note('bass', 2, 0, 30, midi('B1'), 0.7)
    for b in (1, 2, 3): i.hits('tick', b, 'x.o.x.o.x.o.x.o.', v=0.6 + 0.12 * b)
    i.hits('lock', 2, '...x......x..x..', v=0.8); i.hits('lock', 3, '...x..x...x..x..', v=0.9)
    arp(i, 2, 'Bm', 2, 0.55); arp(i, 3, 'Bm', 2, 0.7)
    i.hits('kick', 3, 'x.......x.......', v=0.8); wind(i, 3, 8, 16)
    i.note('fx', 2, 0, 32, 60, 0.18, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.35, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- a: calm. The time lock and the bowls
    a = s.section('a', 16, level=-3.5)
    for b in range(16):
        sym = DIAL_CH[b % 8]
        bed(a, b, sym, 0.9, HIGH[sym] if b % 2 == 0 else None); bass(a, b, sym, 'long'); arp(a, b, sym, 2, 0.6 if b < 8 else 0.72)
        a.hits('kick', b, 'x.......x.......' if b % 2 == 0 else 'x.....x.x.......')
        a.hits('tick', b, 'x.o.x.o.x.o.x.o.' if b < 8 else 'xoxoxoxoxoxoxoxo', v=0.8)
        a.hits('lock', b, '...x......x..x..' if b % 2 == 0 else '......x......x..', v=0.8)
        if b >= 8: a.hits('snare', b, '........o.......', v=0.85)
    a.note('fx', 0, 0, 1, 60, 0.3, s='tinkle'); a.note('fx', 8, 0, 1, 60, 0.26, s='ice'); a.note('fx', 0, 0, 1, 60, 0.12, s='boom')
    for b, text in [(0, 'F#5:4 D5:2 B4:10'), (2, 'G5:4 D5:2 B4:10'), (4, 'E5:4 B4:2 G4:10'), (6, 'F#5:4 C#5:2 A#4:10')]:
        a.line('glass', b, text, 0.8)
    for b in range(8): a.line('glass', 8 + b, DIAL[b], 0.9)
    a.note('fx', 7, 12, 4, 60, 0.3, s='ding'); wind(a, 15, 8, 16)
    a.note('fx', 15, 15.99, 1, 60, 0.3, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- b: fight. The alarm
    f = s.section('b', 16, next='c')
    for b in range(16):
        sym = DIAL_CH[b % 8]
        bed(f, b, sym, 0.85, HIGH[sym] if b % 4 == 0 else None); bass(f, b, sym, 'drive'); lattice(f, b, sym, 0.8)
        f.hits('kick', b, 'x..x....x.x.....' if b % 2 == 0 else 'x..x....x..x..x.')
        f.hits('snare', b, '....x.......x...' if b != 15 else '....x.......x.xx')
        f.hits('tick', b, 'xoxoxoxoxoxoxoxo', v=0.95)
        f.hits('lock', b, '..x...x...x...x.', v=0.75)
        if b >= 8: arp(f, b, sym, 1, 0.6)
        f.line('lead', b, DIAL[b % 8], 1.0); f.line('glass', b, DIAL[b % 8], 0.7, octave=1)
        if b >= 8: f.line('lead', b, third(DIAL[b % 8], 'B'), 0.5)
        if b % 4 == 0: f.note('timp', b, 0, 6, tp(sym), 0.9 if b % 8 == 0 else 0.7)
    for b in (0, 4, 8, 12): f.note('crash', b, 0, 1, 60, 1.0 if b in (0, 8) else 0.6)
    f.note('fx', 0, 0, 1, 60, 0.2, s='boom'); f.note('fx', 0, 0, 1, 60, 0.3, s='shatter'); f.note('fx', 8, 0, 1, 60, 0.26, s='ice')
    f.note('fx', 15, 0, 16, 60, 0.26, s='short'); wind(f, 15, 8, 16); tomfill(f, 15)

    # ---- c: fight. The lattice closing: half time under running arpeggios
    c = s.section('c', 16, next='b')
    for b in range(16):
        sym = GRID_CH[b % 8]
        bed(c, b, sym, 1.0, HIGH[sym] if b % 2 == 0 else None); bass(c, b, sym, 'held'); lattice(c, b, sym, 0.75, 'xxxxxxxxxxxxxxxx' if b >= 8 else 'x.x.x.x.x.x.x.x.')
        c.hits('kick', b, 'x.....x.x.....x.')
        c.hits('snare', b, '........x.......' if b != 15 else '........x...xxxx')
        c.hits('tick', b, 'xoxoxoxoxoxoxoxo', v=0.9); c.hits('lock', b, '....x.......x...', v=0.8)
        c.line('harp', b, GRID[b % 8], 0.95); c.line('lead', b, GRID[b % 8], 0.8)
        if b >= 8: c.line('glass', b, third(GRID[b % 8], 'B'), 0.6)
        if b % 8 in (6, 7): c.note('timp', b, 0, 4, tp('F#'), 0.8); c.note('timp', b, 8, 4, tp('F#'), 0.7)
        elif b % 2 == 0: c.note('timp', b, 0, 6, tp(sym), 0.8)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.2, s='boom')
    c.note('fx', 0, 0, 1, 60, 0.3, s='tinkle'); c.note('fx', 7, 12, 4, 60, 0.3, s='ding')
    wind(c, 15, 4, 24); tomfill(c, 15, 8); c.note('fx', 15, 0, 16, 60, 0.28, s='short')

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
