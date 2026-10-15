"""unwritten: THE UNWRITTEN, the last entry (MUSIC-PLAN.md). "Torn Pages". C minor, 120 that becomes 180.

What the fight is, and so what the music does. It is the only thing in the game made from nothing, by one
hand in one sitting ("there is nothing to copy me back from"), so its tune is its own and owes nothing to
the main theme. It is two halves of one thing, standing apart: the tune is two halves, a question that
ends open and an answer that closes it, and in the first phase they are two pianos, one a side. It
writes your own build back at you: in the second the strings copy the tune two bars late, an octave down,
and wrong where the copy would not fit. It tears the page you are standing on: holes are torn in the
music, a beat or two cut out of every instrument at once with paper ripping in the gap, more of them as
the fight goes on. And it held no ink: the intro is the question on the white keys alone, C major, and the
ink (the flats) arrives with the fight. In the last phase the page tears right through, and for two bars
what shows through the hole is the blank page, the question in C major again on one piano.

It writes itself into a full orchestra. The bar is two seconds throughout: four beats of 120 at first, six
of 180 by the end, so it gets faster without a phrase changing length. The grid is 180's sixteenths
(24 steps a bar): 120's beat is six of them, its sixteenth a step and a half, and a twelve-step pattern is
120's triplets, which are 180's eighths. Phase two runs its hi-hats in those triplets; phase three is 180
outright, a fast three-four whose snare falls across the tune's own beat.

  intro   4 bars, once  the blank page: the question on one piano, white keys only, a high note ticking,
                        then the first tear, and the ink
  p1     16 bars        the two halves: the question on the left piano, the answer on the right, over a
                        heartbeat; then the strings sing it while the two pianos trade a broken chord note
                        for note across the room, a cello under it
  p2     16 bars        it writes you back: your tune on the left piano, the copy on the right, two bars
                        late; then the climb (the tune's opening leap, a step higher each bar), the 180
                        pulse arriving as triplets
  p3     24 bars        written: everything, at 180. The tune in octaves with both pianos (both halves at
                        once), the climb, then the page torn through (the blank question shows through
                        it), the ink flooding back, and the answer to close
  again   2 bars        a death: time rewinds (the fight starts over with less health, and so does this),
                        backwards and fast, then the page waiting, into p1

References: 1-01 The Tale of a Cruel World (one note repeating before anything else, a minor loop of a
chord a bar, almost no drums, the ensemble arriving) and 3-09 Infernal Catharsis (a mountain: it climbs for
minutes, and empties out in the middle before the last rise).
"""
import math
import numpy as np
from daw import Song, Bus, Ev, SR, midi, hp, lp, peak, highshelf, clip, shift, st, fade
from inst import hit, synth, sampler, guitar, amp, clips, riser, reverse, boom
from scores._common import kit, void, page, slow, sing, legato

TITLE = 'Torn Pages'
ORDER = ['intro', 'p1', 'p2', 'p3', 'again', 'p1']

B = 6.0                         # one beat of 120, in the grid's steps
def bt(text): return slow(text, B)

# the tune, a bar a line, in 120's beats. The question ends open, on the second degree; the answer goes home
ASK = ['G4:1 Eb5:2 D5:.5 C5:.5', 'D5:1.5 C5:.5 B4:1 G4:1', 'Ab4:1 F5:2 Eb5:.5 D5:.5', 'Eb5:1 D5:3']
ASK_CH = ['Cm', 'G', 'Fm', 'G']
ANS = ['G4:1 Eb5:2 D5:.5 C5:.5', 'Ab5:1.5 G5:.5 F5:1 Eb5:1', 'F5:1.5 Eb5:.5 D5:1 B4:1', 'C5:4']
ANS_CH = ['Cm', 'Ab', 'G', 'Cm']
TUNE, TUNE_CH = ASK + ANS, ASK_CH + ANS_CH
# with no ink: the question on the white keys
BLANK = ['G4:1 E5:2 D5:.5 C5:.5', 'D5:1.5 C5:.5 B4:1 G4:1', 'A4:1 F5:2 E5:.5 D5:.5', 'E5:1 D5:3']
BLANK_CH = ['C', 'G', 'F', 'G']
# the tune's long notes alone, for the violin
LONG = ['r:1 Eb5:2 r:1', 'D5:1.5 r:2.5', 'r:1 F5:2 r:1', 'Eb5:1 D5:3', 'r:1 Eb5:2 r:1', 'Ab5:1.5 r:2.5', 'F5:1.5 r:2.5', 'C5:4']
# what it writes back: the tune two bars late, an octave down, and wrong where it would not fit the chord
# it lands on (a fifth for the leap in the seventh bar, a C for the held D over A flat)
COPY = [None, None, 'G3:1 Eb4:2 D4:.5 C4:.5', 'D4:1.5 C4:.5 B3:1 G3:1', 'Ab3:1 F4:2 Eb4:.5 D4:.5', 'Eb4:1 C4:3',
        'G3:1 D4:2 C4:.5 B3:.5', 'Ab4:1.5 G4:.5 F4:1 Eb4:1']
# a cello under the second time through
CELLO = ['C4:2 Eb4:2', 'D4:3 B3:1', 'C4:2 Ab3:2', 'B3:2 D4:2', 'Eb4:3 D4:1', 'C4:2 Eb4:2', 'D4:2 F4:2', 'Eb4:4']
# the climb: the tune's opening leap a step higher every bar, over the bass rising A flat, B flat, C
CLIMB = ['Eb5:1 C6:2 Bb5:.5 Ab5:.5', 'F5:1 D6:2 C6:.5 Bb5:.5', 'G5:1 Eb6:2 D6:.5 C6:.5', 'D6:1.5 C6:.5 B5:1 G5:1',
         'Ab5:1.5 G5:.5 F5:1 Eb5:1', 'F5:1.5 Eb5:.5 C5:1 Ab4:1', 'B4:1 D5:1 F5:1 Ab5:1', 'G5:4']
CLIMB_CH = ['Ab', 'Bb', 'Cm', 'G', 'Ab', 'Fm', 'G', 'G']

ROOT = {'Cm': 'C', 'C': 'C', 'G': 'G', 'Fm': 'F', 'F': 'F', 'Ab': 'Ab', 'Bb': 'Bb', 'Eb': 'Eb'}
THIRD = {'Cm': 3, 'Fm': 3}                          # the rest are major
VOICE = {'Cm': 'C4 Eb4 G4', 'C': 'C4 E4 G4', 'G': 'B3 D4 G4', 'Fm': 'C4 F4 Ab4', 'F': 'C4 F4 A4', 'Ab': 'C4 Eb4 Ab4',
         'Bb': 'D4 F4 Bb4', 'Eb': 'Eb4 G4 Bb4'}

def side(p):
    """A bus placed between -1 (left) and 1 (right): its stereo kept, its balance moved."""
    g = np.array([math.cos((p + 1) * math.pi / 4), math.sin((p + 1) * math.pi / 4)]) * 1.414
    return lambda x: x * g
def dehum(x):
    for f in (60.0, 120.0, 180.0, 240.0): x = peak(x, f, -20.0, 9.0)
    return x

def song():
    K = kit(); V = void(); P = page()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}      # the F recording is F major
    s = Song('unwritten', 180, beats=6, steps=24, target=-10.0, ceil=-2.0,
             room=dict(decay=2.6, pre=0.02, bright=6000.0, dark=1500.0),
             master=lambda x: highshelf(hp(x, 30.0), 9000.0, -2.0))
    piano = lambda: sampler(P['piano'], rel=0.45, vel=1.4)
    s.add('pl', Bus(piano(), gain=0.62, rev=0.32, dly=0.06, fx=[dehum, lambda x: hp(x, 35.0), side(-0.6)]))
    s.add('pr', Bus(piano(), gain=0.62, rev=0.32, dly=0.06, fx=[dehum, lambda x: hp(x, 35.0), side(0.6)]))
    s.add('pc', Bus(piano(), gain=0.58, rev=0.5, dly=0.16, fx=[dehum, lambda x: hp(x, 35.0)]))
    s.add('cello', Bus(sampler(P['cello'], rel=0.35), gain=0.38, rev=0.35, fx=[lambda x: hp(x, 70.0), side(0.45)]))
    s.add('copy', Bus(sampler(P['cello'], rel=0.3), gain=0.55, rev=0.3, dly=0.08, fx=[lambda x: hp(x, 70.0), side(0.65)]))
    s.add('violin', Bus(sampler(P['violin'], rel=0.45), gain=0.6, rev=0.4, dly=0.08, fx=[lambda x: hp(x, 220.0), side(-0.15)]))
    s.add('strings', Bus(sampler(V['strings'], rel=0.3), gain=0.5, rev=0.4, fx=[lambda x: hp(x, 250.0)]))
    s.add('pad', Bus(synth('saw', voices=6, detune=0.12, spread=1.0, cutoff=1300.0, res=0.7, track=0.3, a=0.35, d=0.4, s=0.9, r=0.7, drift=6.0),
                     gain=0.11, rev=0.45, duck=0.15, fx=[lambda x: hp(x, 180.0)]))
    s.add('bow', Bus(synth('saw', voices=4, detune=0.1, spread=0.5, sq=0.15, cutoff=2600.0, env=0.6, fdecay=0.3, res=0.9,
                           a=0.03, d=0.25, s=0.9, r=0.25, vib=0.14, vibat=0.3, glide=0.06, dirt=0.15),
                     gain=0.2, dly=0.18, rev=0.32, duck=0.06, fx=[lambda x: peak(hp(x, 220.0), 1800.0, 1.5, 1.0)]))
    s.add('brass', Bus(synth('saw', voices=3, detune=0.08, spread=0.4, cutoff=1300.0, env=1.8, fdecay=0.3, res=0.8, track=0.4,
                             a=0.05, d=0.3, s=0.85, r=0.25, vib=0.08, dirt=0.3, glide=0.07),
                       gain=0.2, rev=0.35, duck=0.1, fx=[lambda x: peak(hp(x, 160.0), 900.0, 2.0, 1.0)]))
    s.add('horn', Bus(sampler(V['horn'], rel=0.25), gain=0.5, rev=0.32, duck=0.12, fx=[lambda x: clip(hp(x, 90.0), 0.7)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.6), gain=0.24, rev=0.55, duck=0.15, fx=[lambda x: hp(x, 180.0)]))
    s.add('low', Bus(synth('saw', voices=2, detune=0.06, spread=0.2, sub=0.6, cutoff=420.0, res=0.8, track=0.2, a=0.08, d=0.3, s=0.85, r=0.4, glide=0.1),
                     gain=0.34, duck=0.3, fx=[lambda x: hp(x, 35.0)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.33, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.75), gain=0.3, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    # the kick's thud is a smear of E and F, which C minor has no use for: two semitones down it is D and E flat
    s.add('kick', Bus(hit(K['kick_m'], tune=-2.0), gain=0.78, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('dkick', Bus(hit(K['kick_m'], tune=-2.0), gain=0.55, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.72, rev=0.16, fx=[lambda x: clip(x, 0.55)]))
    s.add('paper', Bus(hit(P['tear']), gain=0.65, rev=0.2, fx=[lambda x: lp(hp(x, 600.0), 7500.0)]))
    s.add('scrib', Bus(hit(P['scrib'], human=0.003), gain=1.1, rev=0.12, fx=[lambda x: lp(hp(x, 1200.0), 9000.0)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=1.0, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.38, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.26, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.5), gain=0.45, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    s.add('rip', Bus(clips({'rip': P['rip'], 'tear': P['tear']}), gain=0.5, rev=0.3, fx=[lambda x: lp(hp(x, 300.0), 8000.0)]))
    # the rewind: the answer's last bars on the piano, played backwards at twice the speed, rising
    run = [Ev(i * 0.11, 0.1, midi(n), 0.7 + 0.3 * (i % 2)) for i, n in enumerate('C5 B4 D5 Eb5 F5 Eb5 G5 F5 Ab5 G5 C5 Eb5 D5 G4 C5 Eb5 G5 C6'.split())]
    back = sampler(P['piano'], rel=0.2)(run, int(3.0 * SR), dict(t0=0.0))
    back = shift(fade(back[::-1].copy(), 0.3, 0.01), 12.0)
    back = back * np.linspace(0.3, 1.0, len(back))[:, None]
    s.add('fx', Bus(clips({'boom': boom(secs=2.6), 'riser': riser(2 * s.bar, lo=300.0, hi=7000.0), 'short': riser(s.bar, lo=600.0, hi=7000.0),
                           'rev': reverse(K['crash'], 1.6), 'rroll': reverse(V['roll'], 2.2), 'roll': V['roll'], 'swell': V['swell'],
                           'whoosh': V['whoosh'], 'pencil': P['pencil'], 'back': back / max(1e-9, float(np.abs(back).max())),
                           'unrip': reverse(P['rip'])}),
                    gain=1.0, rev=0.25, fx=[lambda x: clip(lp(x, 9000.0), 0.8)]))

    def pc(sym, octave): return midi(ROOT[sym] + str(octave))
    def low_root(sym):
        """The chord's root between C2 and B2."""
        p = pc(sym, 2)
        return p if p < 48 else p - 12
    def tones(sym): r = low_root(sym); return [r, r + 7, r + 12, r + 12 + THIRD.get(sym, 4), r + 19]
    def broken(sec, bar, sym, buses=('pl',), v=0.45, deep=True):
        """The left hand: the chord broken in eighths, up and back (root, fifth, octave, tenth, twelfth,
        tenth, octave, fifth), the root an octave lower under the bar. With two buses the notes alternate
        between them: one broken chord, played by two hands either side of the room."""
        t = tones(sym); order = [0, 1, 2, 3, 4, 3, 2, 1]
        for n, k in enumerate(order):
            sec.note(buses[n % len(buses)], bar, n * 3, 3.5, t[k], v * (1.0 if n == 0 else 0.85))
        if deep: sec.note(buses[0], bar, 0, 24, t[0] - 12, v * 0.8)
    def triplets(sec, bar, sym, buses=('pl', 'pr'), v=0.5):
        """180's eighths: the chord up two octaves and down again, twelve notes, the two pianos in turn."""
        t = tones(sym); up = [t[2], t[3], t[4], t[2] + 12, t[3] + 12, t[4] + 12]
        for n, p in enumerate(up + up[::-1]):
            sec.note(buses[n % 2], bar, n * 2, 2.5, p, v * (1.0 if n % 3 == 0 else 0.8))
    def pad(sec, bar, sym, v=0.8, bars=1, choir=False):
        for m in VOICE[sym].split():
            sec.note('pad', bar, 0, 24 * bars - 1, midi(m), v)
            if choir:
                p = midi(m)
                while p < 55: p += 12
                while p > 68: p -= 12
                sec.note('choir', bar, 0, 24 * bars - 1, p, v)
    def low(sec, bar, sym, frm=None, v=0.8, bars=1):
        r = low_root(sym); old = low_root(frm) if frm else r
        sec.note('low', bar, 0, 24 * bars - 1, r, v, **({'slide': old - r} if old != r else {}))
    def horns(sec, bar, sym, v=0.85, dur=12, at=0):
        r = pc(sym, 2)
        while r - 45 > 5: r -= 12
        while 45 - r > 6: r += 12
        sec.note('horn', bar, at, dur, r, v); sec.note('horn', bar, at, dur, r - 5, v * 0.6)
    def gallop(sec, bar, sym, v=1.0):
        """180's beats: a power chord on each, two mutes after it; the bass on the beat."""
        r = low_root(sym)
        for k in range(6):
            sec.note('gtr', bar, k * 4, 2, r, v, kind='chord'); sec.note('gtr', bar, k * 4 + 2, 1, r, 0.8 * v); sec.note('gtr', bar, k * 4 + 3, 1, r, 0.8 * v)
            sec.note('bass', bar, k * 4, 1.8, r, 0.95 * v); sec.note('bass', bar, k * 4 + 2, 0.9, r, 0.75 * v)
    def tear(sec, bar, step, length, v=1.0, kind='tear'):
        """A hole in the page: every note that would start inside it is never written, every note held into
        it stops at its edge, and in the gap the paper rips. Only what rings already (a room, a cymbal) goes on."""
        t0, t1 = sec.at(bar, step), sec.at(bar, step + length)
        for bus, evs in sec.ev.items():
            if bus in ('rip', 'fx', 'crash', 'china'): continue
            keep = []
            for e in evs:
                if t0 - 1e-9 <= e.t < t1 - 1e-9: continue
                if e.t < t0 and e.t + e.dur > t0: e.dur = t0 - e.t
                keep.append(e)
            sec.ev[bus] = keep
        sec.note('rip', bar, step, length, 60, v, s=kind, len=max(0.12, t1 - t0))

    # ---- intro: the blank page. The question on one piano, white keys only, a high G ticking
    i = s.section('intro', 4, seg=2, loop=False, next='p1', lock=True, level=-2.5)
    for b in range(4):
        i.line('pl', b, bt(BLANK[b]), 0.85)
        if b >= 1: broken(i, b, BLANK_CH[b], ('pl',), 0.38, deep=(b != 1))
        if b < 3: i.hits('pc', b, 'x...x...x...x...', p=midi('G6'), v=0.3)
    i.note('pc', 0, 0, 24, midi('C3'), 0.35)
    for b in (2, 3):
        for m in ('C4', 'E4') if b == 2 else ('B3', 'D4'): i.note('choir', b, 0, 23, midi(m), 0.55)
    i.note('fx', 1, 0, 1, 60, 0.18, s='pencil')
    i.note('fx', 3, 18, 1, 60, 0.3, s='rev', lead=1.6)
    i.note('fx', 3, 0, 24, 60, 0.12, s='short')
    tear(i, 3, 18, 6, 0.85)

    # ---- p1: the two halves. The question on the left, the answer on the right; then the strings, the
    # pianos trading one broken chord between them, a cello
    a = s.section('p1', 16, seg=2, level=-1.5)
    for k in range(8):
        sym = TUNE_CH[k]; frm = TUNE_CH[k - 1] if k else 'G'
        side_ = 'pl' if k < 4 else 'pr'
        a.line(side_, k, bt(TUNE[k]), 0.9); broken(a, k, sym, (side_,), 0.42)
        pad(a, k, sym, 0.55); low(a, k, sym, frm, 0.6)
        a.hits('kick', k, 'x..x............', v=0.42)                      # a heartbeat
        if k < 6: a.hits('pc', k, 'x...x...x...x...', p=midi('G6'), v=0.2 - 0.02 * k)
        if k >= 4: a.hits('paper', k, '........x.......', v=0.5)
    a.note('timp', 0, 0, 12, midi('C2'), 0.7); a.note('timp', 4, 0, 12, midi('C2'), 0.6)
    a.note('fx', 7, 0, 24, 60, 0.14, s='short'); a.note('fx', 7, 23.99, 1, 60, 0.26, s='rev', lead=1.6)
    for k in range(8):
        b = 8 + k; sym = TUNE_CH[k]; frm = TUNE_CH[k - 1] if k else 'Cm'
        legato(a, 'bow', b, bt(TUNE[k]), 0.85); sing(a, 'strings', b, bt(TUNE[k]), 0.7)
        a.line('violin', b, bt(LONG[k]), 0.8)
        a.line('cello', b, bt(CELLO[k]), 0.75)
        broken(a, b, sym, ('pl', 'pr'), 0.42)
        pad(a, b, sym, 0.7, choir=(k >= 4)); low(a, b, sym, frm, 0.75)
        a.hits('kick', b, 'x.....x.........', v=0.75)
        a.hits('snare', b, '........x.......', v=0.62); a.hits('paper', b, '........x.....-.', v=0.7)
        a.hits('scrib', b, 'x.-.x.-.x.-.x.-o', v=0.75)
    a.note('crash', 8, 0, 1, 60, 0.75); a.note('fx', 8, 0, 1, 60, 0.12, s='boom'); a.note('timp', 8, 0, 12, midi('C2'), 0.8)
    a.note('crash', 12, 0, 1, 60, 0.55); a.note('timp', 12, 0, 12, midi('C2'), 0.7)
    tear(a, 11, 18, 6, 0.8)
    tear(a, 15, 18, 6, 0.9)

    # ---- p2: it writes you back. Your tune on the left piano, the copy two bars late on the right;
    # then the climb, the pianos running 180's eighths between them
    q = s.section('p2', 16, seg=2, level=-0.5)
    for k in range(8):
        sym = TUNE_CH[k]; frm = TUNE_CH[k - 1] if k else 'G'
        q.line('pl', k, bt(TUNE[k]), 0.95); broken(q, k, sym, ('pl',), 0.45)
        if COPY[k]: q.line('copy', k, bt(COPY[k]), 0.9); q.line('pr', k, bt(COPY[k]), 0.38, octave=1)
        pad(q, k, sym, 0.75, choir=True); low(q, k, sym, frm, 0.85)
        q.hits('kick', k, 'x.......x.x.....', v=0.85)
        q.hits('snare', k, '....x.......x...', v=0.75); q.hits('paper', k, '....x.......x...', v=0.6)
        q.hits('scrib', k, 'xoxxoxxoxxox', v=0.8)                           # 120's triplets: 180's eighths, arriving
        if k in (0, 4): horns(q, k, sym, 0.8)
    q.note('crash', 0, 0, 1, 60, 0.85); q.note('fx', 0, 0, 1, 60, 0.16, s='boom'); q.note('timp', 0, 0, 12, midi('C2'), 0.85)
    q.note('crash', 4, 0, 1, 60, 0.65); q.note('timp', 4, 0, 12, midi('C2'), 0.75)
    tear(q, 3, 18, 6, 0.8)
    q.note('fx', 7, 0, 24, 60, 0.18, s='short'); q.note('fx', 7, 23.99, 1, 60, 0.28, s='rev', lead=1.6)
    for k in range(8):
        b = 8 + k; sym = CLIMB_CH[k]; frm = CLIMB_CH[k - 1] if k else 'Cm'
        legato(q, 'bow', b, bt(CLIMB[k]), 0.95); sing(q, 'strings', b, bt(CLIMB[k]), 0.8)
        legato(q, 'brass', b, bt(CLIMB[k]), 0.6, octave=-1)
        triplets(q, b, sym, ('pl', 'pr'), 0.42)
        pad(q, b, sym, 0.85, choir=True); low(q, b, sym, frm, 0.95)
        if k % 2 == 0: horns(q, b, sym, 0.9, dur=22); q.note('timp', b, 0, 12, low_root(sym) % 12 + 36, 0.85)
        q.hits('kick', b, 'x.....x.x...x.....x.x...', v=0.9)
        q.hits('snare', b, '....x.......x...', v=0.85); q.hits('paper', b, '....x.......x...', v=0.6)
        q.hits('scrib', b, 'xoxxoxxoxxox', v=0.9); q.hits('hat', b, 'x.o.x.o.x.o.', v=0.6)
    q.note('crash', 8, 0, 1, 60, 1.0); q.note('fx', 8, 0, 1, 60, 0.2, s='boom')
    q.note('crash', 12, 0, 1, 60, 0.8)
    q.note('fx', 14, 0, 48, 60, 0.22, s='riser')
    q.hits('snare', 15, '............x.x.xxxxxxxx', v=0.85)
    tear(q, 11, 18, 6, 0.85)
    tear(q, 15, 12, 6, 0.95)

    # ---- p3: written. 180: a fast three-four, the snare across the tune's own beat
    w = s.section('p3', 24, seg=2)
    def band(b, sym, v=1.0, snare=True):
        w.hits('dkick', b, 'x.x.x.x.x.x.x.x.x.x.x.x.', v=0.8 * v, len=0.1)
        w.hits('kick', b, 'x...........x...........', v=v)
        if snare: w.hits('snare', b, '........x...........x...', v=0.9 * v); w.hits('paper', b, '........x...........x...', v=0.55 * v)
        w.hits('china', b, 'x...x...x...x...x...x...', v=0.5 * v)
        gallop(w, b, sym, v)
    for k in range(8):                                               # the tune in octaves, both pianos with it
        sym = TUNE_CH[k]; frm = TUNE_CH[k - 1] if k else 'Cm'
        legato(w, 'bow', k, bt(TUNE[k]), 1.0); legato(w, 'bow', k, bt(TUNE[k]), 0.5, octave=-1)
        sing(w, 'strings', k, bt(TUNE[k]), 0.85); w.line('violin', k, bt(LONG[k]), 0.85)
        w.line('pl', k, bt(TUNE[k]), 0.8, octave=-1); w.line('pr', k, bt(TUNE[k]), 0.8, octave=1)
        legato(w, 'brass', k, bt(TUNE[k]), 0.55, octave=-1)
        pad(w, k, sym, 0.9, choir=True); band(k, sym)
        if k % 4 == 0: horns(w, k, sym, 0.95, dur=22); w.note('timp', k, 0, 8, low_root(sym) % 12 + 36, 0.9)
    for k in range(8):                                               # the climb
        b = 8 + k; sym = CLIMB_CH[k]
        legato(w, 'bow', b, bt(CLIMB[k]), 1.0); sing(w, 'strings', b, bt(CLIMB[k]), 0.9)
        legato(w, 'brass', b, bt(CLIMB[k]), 0.7, octave=-1)
        triplets(w, b, sym, ('pl', 'pr'), 0.45)
        pad(w, b, sym, 0.95, choir=True); band(b, sym)
        if k % 2 == 0: horns(w, b, sym, 1.0, dur=22); w.note('timp', b, 0, 8, low_root(sym) % 12 + 36, 0.95)
    for b in (0, 8, 12): w.note('crash', b, 0, 1, 60, 1.0); w.note('fx', b, 0, 1, 60, 0.2, s='boom')
    w.note('crash', 4, 0, 1, 60, 0.8)
    w.hits('snare', 15, '........x...x.x.xxxxxxxx', v=0.9)
    tear(w, 7, 18, 6, 0.9); tear(w, 11, 12, 6, 0.9)
    # torn through: the long rip, and the blank page showing in the hole, the question in C major on one piano
    w.note('rip', 16, 0, 12, 60, 1.0, s='rip')
    w.line('pc', 16, bt('r:2 G4:1 E5:1'), 0.8); w.line('pc', 17, bt('E5:1 D5:.5 C5:.5 D5:2'), 0.75)
    w.note('pc', 16, 12, 36, midi('C3'), 0.4); w.note('pc', 17, 0, 24, midi('G2'), 0.35)
    for m in ('C4', 'E4'): w.note('choir', 16, 6, 42, midi(m), 0.45)
    w.note('fx', 16, 9, 1, 60, 0.25, s='pencil')
    # the ink coming back: the question's last two bars, enormous, over a roll
    for k, (sym, text) in enumerate([('Fm', ASK[2]), ('G', ASK[3])]):
        b = 18 + k
        legato(w, 'bow', b, bt(text), 1.0); sing(w, 'strings', b, bt(text), 0.9); legato(w, 'brass', b, bt(text), 0.8, octave=-1)
        horns(w, b, sym, 1.0, dur=22); pad(w, b, sym, 1.0, choir=True); low(w, b, sym, 'Cm' if k == 0 else 'Fm', 1.0)
        w.note('timp', b, 0, 8, low_root(sym) % 12 + 36, 1.0)
        w.hits('kick', b, 'x...........x...........', v=0.9)
    w.note('fx', 18, 0, 1, 60, 0.35, s='roll'); w.note('fx', 18, 0, 1, 60, 0.25, s='swell'); w.note('fx', 18, 0, 48, 60, 0.26, s='riser')
    for n in range(24): w.note('snare', 19, n, 1, 60, 0.3 + 0.65 * n / 23)
    w.note('fx', 19, 23.99, 1, 60, 0.3, s='rev', lead=1.6)
    for k in range(4):                                               # the answer, to close
        b = 20 + k; sym = ANS_CH[k]
        legato(w, 'bow', b, bt(ANS[k]), 1.0); legato(w, 'bow', b, bt(ANS[k]), 0.5, octave=-1)
        sing(w, 'strings', b, bt(ANS[k]), 0.9); w.line('violin', b, bt(LONG[4 + k]), 0.9)
        w.line('pl', b, bt(ANS[k]), 0.85, octave=-1); w.line('pr', b, bt(ANS[k]), 0.85, octave=1)
        legato(w, 'brass', b, bt(ANS[k]), 0.65, octave=-1)
        pad(w, b, sym, 1.0, choir=True); band(b, sym, 1.0, snare=(b != 23))
        horns(w, b, sym, 1.0, dur=22); w.note('timp', b, 0, 8, low_root(sym) % 12 + 36, 1.0)
    w.note('crash', 20, 0, 1, 60, 1.0); w.note('fx', 20, 0, 1, 60, 0.25, s='boom')
    w.hits('snare', 23, '............x.x.xxxxxxxx', v=0.9)
    tear(w, 21, 18, 6, 0.85)

    # ---- again: it rewinds. Backwards and fast, then the page waiting, a high G ticking into p1
    g = s.section('again', 2, seg=2, loop=False, next='p1', lock=True, level=-2.0)
    g.note('fx', 0, 0, 1, 60, 0.5, s='back'); g.note('fx', 0, 0, 1, 60, 0.35, s='unrip')
    g.note('fx', 0, 0, 1, 60, 0.2, s='whoosh')
    g.note('pc', 0, 15, 33, midi('C5'), 0.6); g.note('pc', 0, 15, 33, midi('C3'), 0.4)
    g.hits('pc', 1, 'x...x...x...x...', p=midi('G6'), v=0.28)
    for m in ('C4', 'Eb4', 'G4'): g.note('pad', 1, 0, 23, midi(m), 0.5)
    g.note('fx', 1, 23.99, 1, 60, 0.22, s='rev', lead=1.6)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3', 'again': 'again'}
    s.start = 'intro'
    return s
