"""leak: THE LEAK, fracture iii, and the first piece of BREAKING IN (MUSIC-PLAN.md): one score in three
pieces for the three rooms under THE MIRROR, where no boss waits and the way on is a system to be worked.
All three are made of one loop, five notes, and each room plays it the way its rule works.

Here you carry charge that dies in your hands. So the loop leaks: an acid line runs up its five notes,
then four of them, three, two, one, its filter closing as it goes, and is filled again at the bar line.
Every long note of the tune sags before it ends. 136 BPM, G minor.

  intro  4 bars, once    something dripping; the line, nearly shut
  a      8 bars, calm    the line dull and quiet over a pad, the tune's odd bars on a bell
  b      16 bars, fight  the line wide open over four on the floor; the tune, dying on every long note
  c      16 bars, fight  charging: the line gains a note each time instead of losing one; a second
                         strain over it, with guitars
  d      16 bars, fight  the tune in octaves over everything; the last bar leaks away, and b fills it

The other two pieces are recursion and halt. Each is a whole step lower than the one before: G, F, E flat.
"""
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, keys, clips, riser, reverse, boom, steam
from scores._common import third, kit, void, riff, ring, acid, drip

TITLE = 'Dies in Your Hands'
ORDER = ['intro', 'a', 'b', 'c', 'd']

# the ground, and on each of its chords the loop's five notes
GROUND = ['Gm', 'Gm', 'Eb', 'F', 'Gm', 'Gm', 'Cm', 'D']
RINGS = {'Gm': 'G Bb C D F', 'Eb': 'Eb F G Bb C', 'F': 'F G A C D', 'Cm': 'C Eb F G Bb', 'D': 'D F# A C D'}
ROOT = {'Gm': 'G2', 'Eb': 'Eb2', 'F': 'F2', 'Cm': 'C2', 'D': 'D2'}
# the tune all three pieces share: it picks its way up the loop and holds what it reaches. A bar a line
BREACH = ['G4:2 Bb4:2 C5:2 D5:6 r:4',
          'D5:2 F5:2 G5:8 F5:2 D5:2',
          'Eb5:2 G5:2 Bb5:8 G5:4',
          'A5:6 G5:2 F5:4 C5:4',
          'G4:2 Bb4:2 C5:2 D5:6 F5:4',
          'G5:8 F5:2 D5:2 Bb4:4',
          'C5:2 Eb5:2 G5:6 Eb5:2 C5:4',
          'D5:6 F#5:2 A5:8']
# its second strain, over the chords that climb home; in its fourth bar the loop goes up whole
CLIMB = ['Eb', 'F', 'Gm', 'Gm', 'Eb', 'F', 'D', 'D']
SINK = ['Bb5:8 G5:4 Eb5:4',
        'A5:8 F5:4 C5:4',
        'G5:4 F5:2 D5:2 Bb4:8',
        'G4:2 Bb4:2 C5:2 D5:2 F5:2 G5:6',
        'Bb5:8 G5:4 Bb5:4',
        'C6:8 A5:4 F5:4',
        'A5:6 F#5:2 D5:8',
        'D5:2 F#5:2 A5:2 C6:2 A5:8']

def dying(sec, bus, bar, text, v=1.0, octave=0):
    """A line whose long notes do not last: each sags, a little over a quarter-tone, and dulls before it is let go."""
    step = 0.0
    for tok in text.split():
        name, _, d = tok.partition(':'); d = float(d or 1)
        if name != 'r':
            p = midi(name) + 12 * octave
            if d >= 6:
                sec.note(bus, bar, step, d - 1.5, p, v)
                sec.note(bus, bar, step + d - 1.5, 1.5, p - 0.6, v * 0.45, slide=0.6, open=0.5)
            else: sec.note(bus, bar, step, d, p, v)
        step += d

def song():
    K = kit(); V = void()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 136
    s = Song('leak', 136, target=-12.0, ceil=-1.5, room=dict(decay=2.0, pre=0.02, bright=6000.0, dark=1400.0),
             echo=dict(time=beat * 0.75, fb=0.4, taps=5), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_e'], tune=-1.0), gain=0.4, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('clap', Bus(hit(K['snare_w'], tune=-1.0), gain=0.65, rev=0.16, fx=[lambda x: clip(x, 0.7)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=1.1, fx=[lambda x: clip(hp(x, 500.0), 0.4)]))
    s.add('ohat', Bus(hit(K['ohat'], choke=0.03), gain=0.45, fx=[lambda x: hp(x, 600.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('acid', Bus(acid(), gain=0.3, dly=0.1, rev=0.08, duck=0.25, fx=[lambda x: clip(peak(hp(x, 45.0), 900.0, 2.0, 1.0), 0.8)]))
    s.add('sub', Bus(synth('sine', cutoff=400.0, a=0.01, d=0.2, s=0.9, r=0.1, dirt=0.4), gain=0.16, duck=0.55, fx=[lambda x: hp(x, 35.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.18, spread=1.0, cutoff=900.0, track=0.2, a=0.3, d=0.5, s=0.9, r=0.5, drift=22.0),
                     gain=0.2, rev=0.5, duck=0.45, fx=[lambda x: hp(x, 160.0)]))
    s.add('bell', Bus(keys(ratio=3.5, index=1.6, decay=1.1), gain=0.42, rev=0.4, dly=0.3, fx=[lambda x: hp(x, 300.0)]))
    s.add('lead', Bus(synth('saw', voices=3, detune=0.12, spread=0.45, sq=0.35, cutoff=2800.0, env=1.2, fdecay=0.25, res=1.2,
                            a=0.006, d=0.2, s=0.85, r=0.09, vib=0.1, vibat=0.25, glide=0.16, dirt=0.3),
                      gain=0.26, dly=0.22, rev=0.22, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.36, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.5), gain=0.25, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('drip', Bus(drip(), gain=0.5, dly=0.5, rev=0.4, fx=[lambda x: hp(x, 400.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.5),
                           'hiss': steam(0.5, lo=1800.0, hi=7000.0)}), gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def line(sec, bar, sym, v=1.0, wide=1.0, grow=False, octave=2):
        """The loop for a bar. Leaking: five notes, four, three, two, one, the filter closing each time.
        Charging (grow): one note, two, three, four, five, the filter opening."""
        ns = ring(RINGS[sym], octave); step = 0
        for k, n in enumerate((1, 2, 3, 4, 5) if grow else (5, 4, 3, 2, 1)):
            w = wide * ((0.5 + 0.28 * k) if grow else (1.6 - 0.28 * k))
            for i in range(n):
                kw = dict(slide=float(ns[i - 1] - ns[i])) if i and i % 2 == 0 else {}
                sec.note('acid', bar, step, 0.9, ns[i], v * (1.0 if i == 0 else 0.8), open=w * (1.3 if i == 0 else 1.0), **kw)
                step += 1
    def pad(sec, bar, sym, v=1.0): sec.chordn('pad', bar, 0, 15.5, sym, 3, v)
    def voices(sec, bar, sym, v=0.8):
        for m in chord(sym, 4):
            while m > 67: m -= 12
            while m < 56: m += 12
            sec.note('choir', bar, 0, 15, m, v)
    def drops(sec, bar, sym, v=0.8):
        ns = ring(RINGS[sym], 5)
        sec.note('drip', bar, 6, 1, ns[(bar * 2) % 5], v, slide=7.0); sec.note('drip', bar, 13, 1, ns[(bar * 2 + 3) % 5], v * 0.8, slide=9.0)

    # ---- intro: something dripping; the line, nearly shut
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-2.0)
    for b in range(4):
        pad(i, b, 'Gm', 0.45 + 0.12 * b); drops(i, b, 'Gm', 0.9)
        if b >= 1: line(i, b, 'Gm', 0.7, 0.28 + 0.07 * b)
        if b >= 2: i.hits('kick', b, 'x...............', v=0.7)
    i.note('sub', 2, 0, 31, root('Gm'), 0.5)
    i.note('fx', 2, 0, 32, 60, 0.14, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.2, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- a: calm. The line dull and quiet, the tune's odd bars on a bell
    a = s.section('a', 8, level=-2.0)
    for b in range(8):
        sym = GROUND[b]
        pad(a, b, sym, 0.7); line(a, b, sym, 0.75, 0.42); drops(a, b, sym, 0.8)
        a.note('sub', b, 0, 15, root(sym), 0.6)
        a.hits('kick', b, 'x.......x.......', v=0.6); a.hits('hat', b, '..x...x...x...x.', v=0.6)
        if b % 2 == 0: a.line('bell', b, BREACH[b], 0.85)
    a.note('fx', 7, 15.99, 1, 60, 0.18, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- b: fight. The line wide open; the tune, dying on every long note
    f = s.section('b', 16, next='c')
    for b in range(16):
        k = b % 8; sym = GROUND[k]; second = b >= 8
        pad(f, b, sym, 0.75); line(f, b, sym, 1.0, 1.0)
        f.note('sub', b, 0, 15, root(sym), 0.9)
        f.hits('kick', b, 'x...x...x...x...'); f.hits('clap', b, '....x.......x...' if b != 15 else '....x.......x.xx')
        f.hits('hat', b, 'xoxoxoxoxoxoxoxo', v=0.7); f.hits('ohat', b, '..x...x...x...x.', v=0.8)
        dying(f, 'lead', b, BREACH[k], 1.0)
        if second: f.line('lead', b, third(BREACH[k], 'G'), 0.4)
        if b % 4 == 2: drops(f, b, sym, 0.7)
    for b in (0, 8): f.note('crash', b, 0, 1, 60, 1.0 if b == 0 else 0.8); f.note('fx', b, 0, 1, 60, 0.14, s='boom')
    f.note('fx', 14, 0, 32, 60, 0.16, s='riser')

    # ---- c: fight. Charging: the line gains a note each time; the second strain, with guitars
    c = s.section('c', 16, next='d')
    for b in range(16):
        k = b % 8; sym = CLIMB[k]; second = b >= 8; g = ROOT[sym]
        pad(c, b, sym, 0.75); line(c, b, sym, 1.0, 1.0, grow=True)
        c.note('sub', b, 0, 15, root(sym), 0.9)
        riff(c, b, f'{g}*:4 {g}:2 {g}:2 {g}*:4 {g}:2 {g}:2', bass=False)
        c.hits('kick', b, 'x...x...x...x...'); c.hits('clap', b, '....x.......x...' if b not in (7, 15) else '....x.......xxxx')
        c.hits('hat', b, 'xoxoxoxoxoxoxoxo', v=0.7); c.hits('ohat', b, '..x...x...x...x.', v=0.8)
        dying(c, 'lead', b, SINK[k], 1.0)
        if second: c.line('lead', b, third(SINK[k], 'G'), 0.4)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 1.0); c.note('fx', b, 0, 1, 60, 0.14, s='boom')
    for b in (3, 11): c.note('fx', b, 12, 4, 60, 0.3, s='hiss')
    c.note('fx', 14, 0, 32, 60, 0.16, s='riser')

    # ---- d: fight. The tune in octaves over everything; and the last bar leaks away
    d = s.section('d', 16, next='b')
    for b in range(16):
        k = b % 8; sym = GROUND[k]; g = ROOT[sym]; last = b == 15
        pad(d, b, sym, 0.8); voices(d, b, sym, 0.85 if b < 8 else 1.0)
        line(d, b, sym, 0.95, 1.1 if not last else 0.55, octave=3 if b >= 8 and not last else 2)
        d.note('sub', b, 0, 15, root(sym), 0.9)
        if not last:
            riff(d, b, ' '.join(f'{g}*:2 {g}:1 {g}:1' for _ in range(4)), bass=False)
            d.hits('kick', b, 'x...x...x...x...'); d.hits('clap', b, '....x.......x...' if b != 7 else '....x.......xxxx')
            d.hits('hat', b, 'xxxxxxxxxxxxxxxx', v=0.6); d.hits('ohat', b, '..x...x...x...x.', v=0.85)
        else:
            riff(d, b, f'{g}*:16', bass=False); d.hits('kick', b, 'x...............'); d.hits('clap', b, '............x.xx', v=0.8)
        dying(d, 'lead', b, BREACH[k], 1.0); d.line('lead', b, BREACH[k], 0.45, octave=1)
    for b in (0, 8): d.note('crash', b, 0, 1, 60, 1.0); d.note('fx', b, 0, 1, 60, 0.16, s='boom')
    d.note('crash', 4, 0, 1, 60, 0.6); d.note('crash', 12, 0, 1, 60, 0.6)
    d.note('fx', 15, 0, 16, 60, 0.3, s='hiss'); d.note('fx', 15, 15.99, 1, 60, 0.22, s='rev', lead=1.5 - 0.01 * s.step)

    s.moods = {'calm': 'a', 'fight': ['b', 'c', 'd']}
    s.start = 'intro'
    return s
