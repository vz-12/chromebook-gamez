"""recursion: THE RECURSION, fracture iv, and the second piece of BREAKING IN (see leak.py): the same
five-note loop, a whole step lower, played the way this room's rule works.

Here a packet goes round a ring of five junctions, whether you are ready or not, and a wrong turn loops
it back. So the piece is in five, and the loop is inside itself: its five notes go round in sixteenths,
the bass walks the same five a beat at a time, and the chords are the same five again, a bar each. A
second copy of the fast ring starts one sixteenth later every bar and is back in step on the sixth. Only
one turn leads out of the ring, and the piece takes it once, at the very end. 130 BPM in five-four,
F minor.

  intro  5 bars, once    the ring alone; its echo a step behind; the bass; the chords
  a      5 bars, calm    once round, quietly: glass for hats, a bell holding each bar's note
  b      10 bars, fight  twice round with the band: three, three, two and two; the tune climbs a
                         junction a bar and tumbles back
  c      10 bars, fight  wrong turns: one bar and back to the start, then two, three, four; each
                         try with more of the band
  d      10 bars, fight  round once more, and then the inward turn: where the fifth junction was, the
                         ring stops and the chord that leads home is held; b begins on home
"""
import numpy as np
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, keys, clips, riser, reverse, boom
from scores._common import kit, void, mirror, riff, ring, legato

TITLE = 'It Does Not Wait'
ORDER = ['intro', 'a', 'b', 'c', 'd']

CELL = 'F Ab Bb C Eb'
RINGCH = ['Fm', 'Ab', 'Bbm', 'Cm', 'Eb']               # the same five, as chords: the junctions
ROOT = {'Fm': 'F2', 'Ab': 'Ab2', 'Bbm': 'Bb1', 'Cm': 'C2', 'Eb': 'Eb2', 'C': 'C2'}
# the tune, a bar a junction (a bar is 20 here): three notes up into the junction's own note, held, on the
# bar's second accent. So its held notes are the five again, a bar each; and from the fifth it tumbles back
ROUND = ['Ab4:2 C5:2 Eb5:2 F5:8 C5:2 Ab4:4',
         'C5:2 Eb5:2 F5:2 Ab5:8 Eb5:2 C5:4',
         'Db5:2 F5:2 Ab5:2 Bb5:8 F5:2 Db5:4',
         'Eb5:2 G5:2 Bb5:2 C6:8 G5:2 Eb5:4',
         'G5:2 Bb5:2 Db6:2 Eb6:6 Db6:2 Bb5:2 G5:2 Eb5:2']
OUT = 'C5:2 E5:2 G5:2 C6:14'                           # the inward turn: the one bar with an E natural in it

def song():
    K = kit(); V = void(); M = mirror()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 130
    s = Song('recursion', 130, beats=5, steps=20, target=-12.0, ceil=-1.5, room=dict(decay=2.2, pre=0.02, bright=6500.0, dark=1500.0),
             echo=dict(time=beat * 0.75, fb=0.34, taps=4), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_e'], tune=-1.0), gain=0.42, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(K['snare_w'], tune=2.0), gain=0.6, rev=0.16, fx=[lambda x: clip(x, 0.7)]))      # it rings on E flat as recorded: moved up to F, the keynote
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=1.0, fx=[lambda x: clip(hp(x, 500.0), 0.4)]))
    s.add('shard', Bus(hit(M['shards'], human=0.003), gain=0.7, rev=0.15, fx=[lambda x: hp(x, 1500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    pluck = dict(pw=0.2, cutoff=2600.0, env=3.0, fdecay=0.05, res=1.4, track=0.4, a=0.001, d=0.08, s=0.0, r=0.05)
    s.add('ring', Bus(synth('square', **pluck), gain=0.45, rev=0.2, dly=0.12, fx=[lambda x: hp(x, 300.0) * np.array([1.0, 0.3])]))      # the ring, on the left
    s.add('echo', Bus(synth('square', **pluck), gain=0.45, rev=0.2, dly=0.12, fx=[lambda x: hp(x, 300.0) * np.array([0.3, 1.0])]))      # its copy, on the right
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=520.0, env=2.4, fdecay=0.12, res=1.0,
                            track=0.3, a=0.003, d=0.12, s=0.8, r=0.05, dirt=0.7),
                      gain=0.34, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.14, spread=1.0, cutoff=1000.0, track=0.2, a=0.25, d=0.5, s=0.9, r=0.5),
                     gain=0.2, rev=0.5, duck=0.4, fx=[lambda x: hp(x, 160.0)]))
    s.add('bell', Bus(keys(ratio=3.5, index=1.6, decay=1.6), gain=0.4, rev=0.4, dly=0.3, fx=[lambda x: hp(x, 300.0)]))
    s.add('lead', Bus(synth('saw', voices=3, detune=0.12, spread=0.45, sq=0.35, cutoff=2900.0, env=1.2, fdecay=0.25, res=1.2,
                            a=0.006, d=0.2, s=0.85, r=0.09, vib=0.1, vibat=0.25, glide=0.06, dirt=0.3),
                      gain=0.26, dly=0.22, rev=0.22, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.36, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.5), gain=0.25, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.5),
                           'unsmash': M['unsmash']}), gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    cell = ring(CELL, 4)
    def root(sym): return midi(ROOT[sym])
    def around(sec, bar, late=0, v=1.0, both=True):
        """The ring in sixteenths, four times round in a bar; and its copy, `late` sixteenths behind."""
        for i in range(20):
            sec.note('ring', bar, i, 0.8, cell[i % 5], v * (1.0 if i % 5 == 0 else 0.8))
            if both: sec.note('echo', bar, i, 0.8, cell[(i - late) % 5], v * (1.0 if (i - late) % 5 == 0 else 0.8))
    def walk(sec, bar, j, v=1.0):
        """The bass: the same five notes a beat each, from this bar's junction on round."""
        ns = ring(CELL, 2); ns = ns[j:] + [n + 12 for n in ns[:j]]
        while ns[0] >= 48: ns = [n - 12 for n in ns]
        for b, n in enumerate(ns): sec.note('bass', bar, b * 4, 3.5, n, v * (1.0 if b in (0, 3) else 0.85))
    def pad(sec, bar, sym, v=1.0):
        """The bar's chord, and under every chord the keynote, held: with five chords in a ring and none of them
        the last, something has to say which one is home."""
        sec.chordn('pad', bar, 0, 19.5, sym, 3, v)
        if sym != 'C': sec.note('pad', bar, 0, 19.5, 53, v * 0.8); sec.note('pad', bar, 0, 19.5, 65, v * 0.6)
    def voices(sec, bar, sym, v=0.8):
        for m in chord(sym, 4):
            while m > 67: m -= 12
            while m < 56: m += 12
            sec.note('choir', bar, 0, 19, m, v)
    def drums(sec, bar, fill=False, v=1.0):
        sec.hits('kick', bar, 'x.....x...x.........', v=v)
        sec.hits('snare', bar, '............x...x...' if not fill else '............x...x.xx', v=v)
        sec.hits('hat', bar, 'x.x.x.x.x.x.x.x.x.x.', v=0.8 * v)
    def chug(sec, bar, sym):
        g = ROOT[sym]
        riff(sec, bar, f'{g}*:3 {g}:1 {g}:2 {g}*:3 {g}:1 {g}:2 {g}*:2 {g}:2 {g}*:2 {g}:2', bass=False)

    # ---- intro: the ring alone; its echo; the bass; the chords
    i = s.section('intro', 5, seg=5, loop=False, next='a', lock=True)
    for b in range(5):
        around(i, b, late=b, v=0.7 + 0.05 * b, both=(b >= 1))
        if b >= 2: walk(i, b, b, 0.45 + 0.05 * b)
        if b >= 3: pad(i, b, RINGCH[b], 0.6 + 0.1 * (b - 3))
    i.hits('kick', 4, 'x.....x...x.........', v=0.7)
    i.note('fx', 4, 0, 20, 60, 0.14, s='riser'); i.note('fx', 4, 19.99, 1, 60, 0.2, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- a: calm. Once round, quietly
    a = s.section('a', 5, seg=5)
    for b in range(5):
        sym = RINGCH[b]
        around(a, b, late=b, v=0.75); walk(a, b, b, 0.5); pad(a, b, sym, 0.6)
        a.hits('kick', b, 'x.....x.............', v=0.6); a.hits('shard', b, 'x.x.x.x.x.x.x.x.x.x.', v=0.6)
        a.note('bell', b, 0, 19, cell[b] + 12, 1.1)                 # the bar's own note of the five
    a.note('fx', 4, 19.99, 1, 60, 0.18, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- b: fight. Twice round with the band
    f = s.section('b', 10, seg=2, next='c')
    prev = None
    for b in range(10):
        j = b % 5; sym = RINGCH[j]; second = b >= 5
        around(f, b, late=j); walk(f, b, j); pad(f, b, sym, 0.75); chug(f, b, sym)
        drums(f, b, fill=(b == 9))
        prev = legato(f, 'lead', b, ROUND[j], 1.0, most=12, prev=prev)
        if second: f.line('lead', b, ROUND[j], 0.4, octave=1)
    for b in (0, 5): f.note('crash', b, 0, 1, 60, 1.0 if b == 0 else 0.8); f.note('fx', b, 0, 1, 60, 0.14, s='boom')
    f.note('fx', 9, 0, 20, 60, 0.16, s='riser')

    # ---- c: fight. Wrong turns: one bar and back, then two, three, four
    c = s.section('c', 10, seg=2, next='d')
    b = 0; prev = None
    for attempt in range(1, 5):
        for j in range(attempt):
            sym = RINGCH[j]
            around(c, b, late=attempt, both=(attempt >= 2)); walk(c, b, j); drums(c, b, fill=(j == attempt - 1))
            if attempt >= 2: chug(c, b, sym)
            if attempt >= 3: pad(c, b, sym, 0.75)
            if attempt >= 4: voices(c, b, sym, 0.9)
            prev = legato(c, 'lead', b, ROUND[j], 1.0, most=12, prev=prev if j else None)
            if attempt >= 3: c.line('lead', b, ROUND[j], 0.4, octave=1)
            if j == 0:
                c.note('crash', b, 0, 1, 60, 0.7 + 0.1 * attempt); c.note('fx', b, 0, 1, 60, 0.1 + 0.02 * attempt, s='boom')
            if j == attempt - 1 and attempt < 4:                    # looped back: the glass flies together again
                c.note('fx', b, 19.99, 1, 60, 0.3, s='unsmash', lead=0.5 - 0.01 * s.step)
            b += 1
    c.note('fx', 9, 0, 20, 60, 0.16, s='riser')

    # ---- d: fight. Round once more, and then the inward turn
    d = s.section('d', 10, seg=2, next='b')
    prev = None
    for b in range(10):
        j = b % 5; out = b == 9; sym = 'C' if out else RINGCH[j]
        pad(d, b, sym, 0.8); voices(d, b, sym, 0.85 if b < 5 else 1.0)
        if out:                                                     # out of the ring: it stops going round
            g = ROOT[sym]
            riff(d, b, f'{g}*:12 {g}*:4 {g}:2 {g}:2', bass=False); d.note('bass', b, 0, 19, root(sym), 1.0)
            d.hits('kick', b, 'x.....x.....x...x...'); d.hits('snare', b, '............x...xxxx', semi=-1.0); d.note('crash', b, 0, 1, 60, 1.0)     # the snare's ring moved from F to the chord's E for this bar
            prev = legato(d, 'lead', b, OUT, 1.0, most=12, prev=prev); d.line('lead', b, OUT, 0.45, octave=1)
        else:
            around(d, b, late=j); walk(d, b, j); chug(d, b, sym); drums(d, b)
            d.hits('hat', b, '.x.x.x.x.x.x.x.x.x.x', v=0.5)
            prev = legato(d, 'lead', b, ROUND[j], 1.0, most=12, prev=prev); d.line('lead', b, ROUND[j], 0.45, octave=1)
    for b in (0, 5): d.note('crash', b, 0, 1, 60, 1.0); d.note('fx', b, 0, 1, 60, 0.16, s='boom')
    d.note('fx', 9, 19.99, 1, 60, 0.22, s='rev', lead=1.5 - 0.01 * s.step)

    s.moods = {'calm': 'a', 'fight': ['b', 'c', 'd']}
    s.start = 'intro'
    return s
