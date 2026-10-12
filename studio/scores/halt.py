"""halt: THE HALT, fracture v, and the last piece of BREAKING AND ENTERING (see leak.py): the same five-note loop
and the same tune, a whole step lower again, played the way this room's rule works.

Here the room deadlocks: you may move or you may act, never both. So the piece is in threes of bars. For
two bars the band moves, the loop gaining a note at a time, and there is no tune. Then everything stops
where it stood: a chord held like a frame, a clock, and over it the tune acts, one bar of it, alone. The
band and the tune are never heard together. 136 BPM (the beat all three pieces keep), E flat minor.

  intro  3 bars, once    a clock, for two bars; then the first held chord, and the tune's first bar
  a      6 bars, calm    two rounds, quietly: the loop on a pluck over the clock, the tune on a piano
  b      12 bars, fight  four rounds with the band: the loop winds up, is switched off, and the tune
                         speaks into the stillness: its first half
  c      12 bars, fight  the loop runs down instead (five notes, four, three...) over both feet; the
                         tune's second half
  d      12 bars, fight  the second strain, in octaves with a choir, guitars held under it; its third
                         round is the loop going up whole
  end    6 bars          how the three end, when they are played as one: the room held, and not let go
"""
import numpy as np
from daw import SR, Ev, Song, Bus, chord, midi, hp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, tapestop
from scores._common import kit, void, vault, riff, ring, legato, move
from scores.leak import BREACH, SINK

TITLE = 'After You'
ORDER = ['intro', 'a', 'b', 'c', 'd']

TUNE = [move(t, -4) for t in BREACH]                  # the tune, down from G to E flat
RISE = [move(t, -4) for t in SINK]
RINGS = {'Ebm': 'Eb Gb Ab Bb Db', 'B': 'B Db Eb Gb Ab', 'Db': 'Db Eb F Ab Bb', 'Abm': 'Ab B Db Eb Gb', 'Bb': 'Bb D F Ab Bb'}
ROOT = {'Ebm': 'Eb2', 'B': 'B1', 'Db': 'Db2', 'Abm': 'Ab1', 'Bb': 'Bb1'}
# each round: the chord it stands on, and the bar of the tune that acts in its third bar
ROUNDS = {'b': [('Ebm', TUNE[0]), ('B', TUNE[2]), ('Db', TUNE[3]), ('Bb', TUNE[7])],
          'c': [('Ebm', TUNE[4]), ('Ebm', TUNE[5]), ('Abm', TUNE[6]), ('Bb', TUNE[7])],
          'd': [('B', RISE[0]), ('Db', RISE[1]), ('Ebm', RISE[3]), ('Bb', RISE[7])]}

def song():
    K = kit(); V = void(); T = vault()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 136
    s = Song('halt', 136, target=-12.0, ceil=-1.5, room=dict(decay=2.6, pre=0.02, bright=6000.0, dark=1400.0),
             echo=dict(time=beat * 0.75, fb=0.4, taps=5), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.7, key=True, fx=[lambda x: clip(x, 0.7)]))      # its thud moved from E onto E flat, the keynote
    s.add('dkick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.55, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_w']), gain=0.5, rev=0.16, fx=[lambda x: clip(x, 0.7)]))                 # it rings on E flat as it is
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=1.0, fx=[lambda x: clip(hp(x, 500.0), 0.4)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('tick', Bus(hit(T['tick'], human=0.002), gain=1.3, rev=0.14, fx=[lambda x: clip(hp(x, 700.0), 0.3)]))   # the clock: it is all that moves while the room is held
    s.add('seq', Bus(synth('square', pw=0.2, cutoff=1500.0, env=4.0, fdecay=0.06, res=1.8, track=0.4, a=0.001, d=0.09, s=0.0, r=0.05, dirt=0.3),
                     gain=0.5, rev=0.12, dly=0.1, fx=[lambda x: clip(hp(x, 200.0), 0.45)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.36, rev=0.08, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.14, spread=1.0, cutoff=1100.0, track=0.2, a=0.02, d=0.6, s=0.85, r=0.4),
                     gain=0.22, rev=0.55, fx=[lambda x: hp(x, 160.0)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.4), gain=0.26, rev=0.55, fx=[lambda x: hp(x, 180.0)]))
    s.add('piano', Bus(sampler(V['piano'], rel=0.5), gain=0.5, rev=0.4, dly=0.2, fx=[lambda x: hp(x, 150.0)]))
    s.add('lead', Bus(synth('saw', voices=3, detune=0.12, spread=0.45, sq=0.35, cutoff=2900.0, env=1.2, fdecay=0.25, res=1.2,
                            a=0.006, d=0.2, s=0.85, r=0.09, vib=0.1, vibat=0.25, glide=0.06, dirt=0.3),
                      gain=0.3, dly=0.3, rev=0.3, fx=[lambda x: hp(x, 250.0)]))
    # a bass note with the power taken away under it, for the moment the room is held
    low = synth('saw', voices=2, detune=0.08, sub=0.5, sq=0.4, cutoff=900.0, env=1.5, fdecay=0.2, a=0.003, d=0.2, s=0.9, r=0.1, dirt=0.6)
    def off(p):
        x = tapestop(low([Ev(0.0, 1.4, p, 1.0)], int(1.8 * SR), dict(t0=0.0)), 0.03, 0.75)
        return x / max(1e-9, float(np.abs(x).max()))
    table = {'boom': boom(secs=2.2), 'riser': riser(s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.4)}
    for sym, r in ROOT.items(): table['off' + sym] = off(midi(r) + 12)
    s.add('fx', Bus(clips(table), gain=1.0, rev=0.3, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def loop(sec, bar, sym, v=1.0, down=False, bus='seq', octave=3):
        """The loop, for a bar that moves. Winding up: one note, two, three, four, five. Running down (down):
        five, four, three, two, one. The last sixteenth is left empty either way."""
        ns = ring(RINGS[sym], octave); step = 0
        for n in ((5, 4, 3, 2, 1) if down else (1, 2, 3, 4, 5)):
            for k in range(n):
                sec.note(bus, bar, step, 0.9, ns[k], v * (1.0 if k == 0 else 0.8)); step += 1
    def accents(g, down=False):
        """The guitars on the same groups: a chord where each begins, mutes for the rest."""
        out = []
        for n in ((5, 4, 3, 2, 1) if down else (1, 2, 3, 4, 5)): out += [f'{g}*:1'] + [f'{g}:1'] * (n - 1)
        return ' '.join(out + ['r:1'])
    def frame(sec, bar, sym, v=1.0, voices=False, clock=True):
        """The room held: the chord as it stood, and nothing moving but the clock."""
        for m in chord(sym, 3):
            while m < 51: m += 12
            sec.note('pad', bar, 0, 15.5, m, v)
            if voices:
                while m < 56: m += 12
                while m > 67: m -= 12
                sec.note('choir', bar, 0, 15, m, v * 0.9)
        if clock: sec.hits('tick', bar, 'x...x...x...x...', v=1.0)

    def moving(sec, bar, sym, kind, last):
        """One bar of the band. kind: 'b' winds the loop up, 'c' runs it down over both feet, 'd' does both."""
        g = ROOT[sym]; down = kind == 'c' or (kind == 'd' and last)
        loop(sec, bar, sym, 1.0, down=down); riff(sec, bar, accents(g, down), bass=False)
        for n in range(8): sec.note('bass', bar, n * 2, 1.7, root(sym), 1.0 if n % 2 == 0 else 0.82)
        sec.hits('kick', bar, 'x.....x...x.....' if not last else 'x.....x...x...x.')
        sec.hits('snare', bar, '....x.......x...' if not last else '....x.......xxxx')
        sec.hits('hat', bar, 'x.x.x.x.x.x.x.x.' if kind == 'b' else 'xoxoxoxoxoxoxoxo', v=0.85)
        if kind != 'b': sec.hits('dkick', bar, 'xoxoxoxoxoxoxoxo', v=0.8, len=0.09)

    # ---- intro: a clock; then the first held chord, and the tune's first bar
    i = s.section('intro', 3, seg=3, loop=False, next='a', lock=True)
    for b in (0, 1): i.hits('tick', b, 'x.o.x.o.x.o.x.o.', v=0.7 + 0.15 * b)
    i.note('bass', 0, 0, 31, root('Ebm'), 0.14, open=0.5)
    i.note('piano', 0, 0, 30, midi('Eb3'), 0.65); i.note('piano', 0, 0, 30, midi('Eb2'), 0.55)          # where it begins: the keynote, low, struck once
    loop(i, 1, 'Ebm', 0.6)
    frame(i, 2, 'Ebm', 0.7); i.line('piano', 2, TUNE[0], 0.8)
    i.note('fx', 2, 0, 1, 60, 0.12, s='boom')

    # ---- a: calm. Two rounds, quietly
    a = s.section('a', 6, seg=3, level=0.0)
    for u, (sym, tune) in enumerate([('Ebm', TUNE[1]), ('Bb', TUNE[7])]):
        b = u * 3
        for h in (0, 1):
            loop(a, b + h, sym, 0.5); a.hits('tick', b + h, 'x.o.x.o.x.o.x.o.', v=0.8)
            a.hits('kick', b + h, 'x.......x.......', v=0.55)
            for n in range(4): a.note('bass', b + h, n * 4, 3, root(sym), 0.25, open=0.6)
        frame(a, b + 2, sym, 0.6); a.line('piano', b + 2, tune, 0.9)

    # ---- b, c, d: fight. The band for two bars; then the room held, and the tune
    for name, nxt in (('b', 'c'), ('c', 'd'), ('d', 'b')):
        f = s.section(name, 12, seg=3, next=nxt)
        for u, (sym, tune) in enumerate(ROUNDS[name]):
            b = u * 3
            moving(f, b, sym, name, False); moving(f, b + 1, sym, name, True)
            f.note('crash', b, 0, 1, 60, 1.0 if u == 0 else 0.7)
            if u == 0: f.note('fx', b, 0, 1, 60, 0.1, s='boom')
            # held
            frame(f, b + 2, sym, 0.75, voices=(name != 'b'))
            f.note('fx', b + 2, 0, 1, 60, 0.17, s='off' + sym)
            if name == 'd': riff(f, b + 2, f'{ROOT[sym]}*:16', bass=False)        # the guitars held too, under the choir
            legato(f, 'lead', b + 2, tune, 0.85, most=12)
            if name == 'd': f.line('lead', b + 2, tune, 0.4, octave=1)
            f.note('fx', b + 2, 15.99, 1, 60, 0.15, s='rev', lead=1.4 - 0.01 * s.step)

    # ---- end: how the three end, when they are played as one (breakin.py). One more round on the home
    #      chord, the band running down; and this time the room is not let go. The clock slows, and stops
    e = s.section('end', 6, seg=3, loop=False, lock=True)
    moving(e, 0, 'Ebm', 'c', False); e.note('crash', 0, 0, 1, 60, 0.7)
    loop(e, 1, 'Ebm', 1.0, down=True); riff(e, 1, accents(ROOT['Ebm'], True), bass=False)        # the second bar thins as it goes
    for n in range(4): e.note('bass', 1, n * 2, 1.7, root('Ebm'), 1.0 if n % 2 == 0 else 0.82)
    e.hits('kick', 1, 'x.....x.........'); e.hits('snare', 1, '....x.......x...', v=0.8); e.hits('hat', 1, 'x.x.x.x.........', v=0.8)
    frame(e, 2, 'Ebm', 0.9, voices=True); e.note('fx', 2, 0, 1, 60, 0.17, s='offEbm')
    legato(e, 'lead', 2, TUNE[0], 0.85, most=12); e.line('lead', 2, TUNE[0], 0.4, octave=1)
    for b in (3, 4, 5): frame(e, b, 'Ebm', 0.8 - 0.12 * (b - 3), voices=True, clock=False)
    for b, at in ((3, 0), (3, 4), (3, 9), (3, 15), (4, 6), (4, 14), (5, 8)): e.note('tick', b, at, 1, 60, 0.9 - 0.08 * (b - 3))
    e.line('piano', 3, TUNE[0], 0.8)
    e.note('piano', 4, 6, 10, midi('Bb3'), 0.7); e.note('piano', 4, 6, 10, midi('Gb3'), 0.6)
    e.note('piano', 5, 8, 16, midi('Eb3'), 0.8); e.note('piano', 5, 8, 16, midi('Eb2'), 0.7)

    s.moods = {'calm': 'a', 'fight': ['b', 'c', 'd']}
    s.start = 'intro'
    return s
