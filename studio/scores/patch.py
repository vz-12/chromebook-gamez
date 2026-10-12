"""patch: THE PATCH, ALL HALLOWS chapter one (MUSIC-PLAN.md). A pumpkin patch at night, and what is
ripening in it. A jig in a minor key: four beats to the bar and three to the beat, long-short, long-short,
on a harpsichord over a tuba and plucked strings, with a xylophone for the ribs and a theremin for
whatever is standing in the field. 150 BPM, D minor, with an E flat where the vine catches.

  intro  4 bars, once     the night: insects, wind, a bell; the tuba finds the beat, then the tune's
                          first four notes
  a      16 bars, calm    the patch between waves: tuba and pizzicato, the tune in pieces with the
                          theremin answering each, then whole on the harpsichord
  b      16 bars, fight   the jig at full tilt: the drums shuffling, guitars, an organ on the off-beats,
                          the tune doubled
  c      16 bars, fight   the scarecrow: half time, the bass walking down by semitones, one long line on
                          the theremin over the organ and a choir; back into b

The tune opens on four notes, the keynote, the fifth, the note above it and the fifth again, which every
ALL HALLOWS track begins from.
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, organ, wind, creak, thunder
from scores._common import third, kit, hallows, riff, legato, theremin, bones, harpsichord

TITLE = 'Left to Ripen'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the jig, a bar a line, in twelfths of a bar (three to the beat): 2 and 1 are the long and the short
JIG = ['D5:2 A5:1 Bb5:2 A5:1 F5:2 E5:1 D5:3',
       'F5:2 E5:1 D5:2 C#5:1 D5:3 A4:3',
       'D5:2 F5:1 Bb5:2 A5:1 G5:2 F5:1 D5:3',
       'E5:2 D5:1 C#5:2 E5:1 A5:6',
       'D5:2 A5:1 Bb5:2 A5:1 F5:2 E5:1 D5:3',
       'G5:2 Bb5:1 D6:2 C6:1 Bb5:2 A5:1 G5:3',
       'Bb5:2 G5:1 Eb5:2 G5:1 Bb5:3 A5:2 G5:1',
       'E5:3 C#5:2 E5:1 A4:3 C#5:1 E5:1 A5:1']
JIG_CH = ['Dm', 'Dm', 'Bb', 'A', 'Dm', 'Gm', 'Eb', 'A']
# the scarecrow's: the bass goes down a semitone a bar under it (the chord, and the note under the chord)
FALL = [('Dm', 'D2'), ('A', 'C#2'), ('F', 'C2'), ('G', 'B1'), ('Bb', 'Bb1'), ('Gm', 'G1'), ('A', 'A1'), ('A', 'A1')]
LANTERN = ['A5:6 F5:3 A5:3',
           'G5:6 E5:3 A5:3',
           'F5:6 C5:3 F5:3',
           'D5:6 B4:3 D5:3',
           'D5:3 F5:3 Bb5:6',
           'A5:3 G5:3 D5:6',
           'C#5:3 E5:3 A5:3 G5:3',
           'F5:2 E5:1 D5:2 C#5:1 E5:6']
ROOT = {'Dm': 'D2', 'Bb': 'Bb1', 'A': 'A1', 'Gm': 'G2', 'Eb': 'Eb2', 'F': 'F2', 'G': 'G2'}
PAH = {'Dm': (57, 62, 65), 'Bb': (58, 62, 65), 'A': (57, 61, 64), 'Gm': (55, 58, 62), 'Eb': (55, 58, 63), 'F': (57, 60, 65), 'G': (55, 59, 62)}

def song():
    K = kit(); H = hallows()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 150
    s = Song('patch', 150, steps=12, target=-12.0, ceil=-1.5, room=dict(decay=2.2, pre=0.02, bright=6000.0, dark=1500.0),
             echo=dict(time=beat, fb=0.3, taps=3), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.58, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.55, rev=0.14, fx=[lambda x: clip(x, 0.65)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.7, fx=[lambda x: clip(hp(x, 500.0), 0.3)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('clave', Bus(hit(H['clave']), gain=0.6, dly=0.2, rev=0.25, fx=[lambda x: clip(hp(x, 500.0), 0.45)]))
    s.add('cab', Bus(hit(H['cabasa'], human=0.004), gain=0.3, fx=[lambda x: hp(x, 1200.0)]))
    s.add('timp', Bus(sampler(H['timp'], rel=0.5), gain=0.4, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    s.add('tuba', Bus(sampler(H['tuba'], rel=0.12), gain=0.6, rev=0.12, fx=[lambda x: clip(lp(peak(hp(x, 45.0), 240.0, 3.0, 1.0), 330.0), 0.7)]))     # its fifth harmonic is loud, and over a D that is an F sharp: kept under
    s.add('pizz', Bus(sampler(H['pizz'], rel=0.1), gain=0.5, rev=0.25, fx=[lambda x: hp(x, 150.0)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.34, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('harpsi', Bus(harpsichord(), gain=0.42, rev=0.24, dly=0.12, fx=[lambda x: hp(x, 180.0)]))
    s.add('bones', Bus(bones(), gain=0.3, rev=0.2, dly=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('organ', Bus(organ(trem=0.25), gain=0.3, rev=0.3, duck=0.15, fx=[lambda x: clip(hp(x, 120.0), 0.6)]))
    s.add('ther', Bus(theremin(), gain=0.42, rev=0.35, dly=0.25, fx=[lambda x: hp(x, 250.0)]))
    s.add('lead', Bus(synth('saw', voices=2, detune=0.1, spread=0.35, sq=0.4, cutoff=2700.0, env=1.2, fdecay=0.2, res=1.2,
                            a=0.005, d=0.16, s=0.8, r=0.08, vib=0.1, dirt=0.3),
                      gain=0.24, dly=0.2, rev=0.2, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.5), gain=0.25, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('bell', Bus(sampler(H['bell'], rel=1.5), gain=0.35, rev=0.4, fx=[lambda x: hp(x, 150.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.5),
                           'wind': wind(4.5), 'gust': wind(6.0, lo=320.0, hi=1700.0, gusts=4, seed=31), 'night': H['night'],
                           'creak': creak(1.1), 'thunder': thunder(4.0), 'guiro': H['guiro']}),
                    gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def oom(sec, bar, sym, v=0.8, low=None):
        """The tuba: the root on one, the fifth on three."""
        r = midi(low) if low else root(sym); fifth = r + 7 if r + 7 <= 46 else r - 5
        sec.note('tuba', bar, 0, 2.5, r, v); sec.note('tuba', bar, 6, 2.5, r if low else fifth, v * 0.9)
    def pah(sec, bar, sym, v=0.7, at=(3, 9)):
        for a in at:
            for m in PAH[sym]: sec.note('pizz', bar, a, 1.5, m, v)
    def held(sec, bus, bar, sym, v=1.0, lo=50, hi=65, dur=11.5):
        for m in chord(sym, 3):
            while m < lo: m += 12
            while m > hi: m -= 12
            sec.note(bus, bar, 0, dur, m, v)
    def skank(sec, bar, sym, v=0.8):
        """The organ on the off-beats: two and four."""
        for a in (3, 9):
            for m in PAH[sym]: sec.note('organ', bar, a, 1.6, m, v)

    # ---- intro: the night
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=4.0)
    i.note('fx', 0, 0, 1, 60, 0.2, s='night'); i.note('fx', 0, 0, 1, 60, 0.26, s='gust'); i.note('bell', 0, 0, 20, 53, 0.8)
    for b in range(4):
        sym = 'A' if b == 3 else 'Dm'
        oom(i, b, sym, 0.55 + 0.08 * b)
        if b >= 1: i.hits('clave', b, 'x.....x..x..', v=0.7)
        if b >= 2: pah(i, b, sym, 0.4 + 0.08 * (b - 2))
    i.line('harpsi', 2, 'D5:2 A5:1 Bb5:2 A5:1 r:6', 0.7, octave=-1)
    i.line('harpsi', 3, JIG[3], 0.75, octave=-1)
    i.note('timp', 3, 6, 3, 45, 0.5); i.note('timp', 3, 9, 3, 45, 0.65)
    i.note('fx', 3, 2, 4, 60, 0.3, s='creak'); i.note('fx', 3, 11.99, 1, 60, 0.2, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- a: calm. The patch between waves
    a = s.section('a', 16, level=3.8)
    for b in range(16):
        k = b % 8; sym = JIG_CH[k]
        oom(a, b, sym, 0.62 if b < 8 else 0.7); pah(a, b, sym, 0.45 if b < 8 else 0.52)
        a.hits('clave', b, 'x.....x..x..' if b % 2 == 0 else '...x.....x.x', v=0.65)
        if b >= 4: a.hits('cab', b, 'x.ox.ox.ox.o', v=0.6 if b < 8 else 0.75)
        if b >= 8: a.hits('kick', b, 'x.....x.....', v=0.55)
        if b % 4 == 0: a.note('fx', b, 0, 1, 60, 0.24, s='night')
    # the tune in pieces, the theremin answering each
    a.line('harpsi', 0, 'D5:2 A5:1 Bb5:2 A5:1 r:6', 0.7, octave=-1)
    a.line('harpsi', 2, 'D5:2 F5:1 Bb5:2 A5:1 r:6', 0.7, octave=-1)
    a.line('harpsi', 4, JIG[4], 0.72, octave=-1)
    a.line('harpsi', 6, 'Bb5:2 G5:1 Eb5:2 G5:1 Bb5:3 r:3', 0.72, octave=-1)
    prev = None
    for b, text in ((1, 'r:3 A5:6 F5:3'), (3, 'r:3 E5:6 C#5:3'), (5, 'r:3 D6:6 Bb5:3'), (7, 'r:3 A5:3 G#5:3 A5:3')):
        prev = legato(a, 'ther', b, text, 0.42, most=12, prev=None)
    # and then whole
    for b in range(8):
        a.line('harpsi', 8 + b, JIG[b], 0.8, octave=-1)
        if b >= 4: a.line('bones', 8 + b, JIG[b], 0.55)
    a.note('bell', 0, 0, 20, 53, 0.6); a.note('bell', 8, 0, 20, 53, 0.5)
    a.note('fx', 2, 0, 1, 60, 0.3, s='wind'); a.note('fx', 10, 6, 1, 60, 0.26, s='gust')
    a.note('fx', 7, 6, 4, 60, 0.22, s='creak')
    a.note('timp', 15, 6, 3, 45, 0.4); a.note('timp', 15, 9, 3, 45, 0.5)
    a.note('fx', 15, 11.99, 1, 60, 0.2, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- b: fight. The jig at full tilt
    f = s.section('b', 16, next='c')
    for b in range(16):
        k = b % 8; sym = JIG_CH[k]; g = ROOT[sym]; second = b >= 8
        riff(f, b, f'{g}*:2 {g}:1 {g}:2 {g}:1 {g}*:2 {g}:1 {g}:2 {g}:1')
        oom(f, b, sym, 0.8); skank(f, b, sym, 1.0 if not second else 1.15)
        f.hits('kick', b, 'x.....x..x..' if b % 2 == 0 else 'x....xx.....')
        f.hits('snare', b, '...x.....x..' if b != 15 else '...x..x..xxx')
        f.hits('hat', b, 'x.ox.ox.ox.o', v=0.85)
        f.hits('clave', b, '.....x.....x', v=0.6)
        f.line('lead', b, JIG[k], 1.0); f.line('harpsi', b, JIG[k], 0.9, octave=-1)
        if second: f.line('bones', b, JIG[k], 0.7); f.line('lead', b, third(JIG[k], 'D'), 0.42)
    for b in (0, 8): f.note('crash', b, 0, 1, 60, 1.0); f.note('fx', b, 0, 1, 60, 0.14, s='boom')
    for b in (4, 12): f.note('crash', b, 0, 1, 60, 0.6)
    for n, semi in enumerate((7, 2, -5)): f.note('tom', 7, 9 + n, 1, 60, 0.8, semi=semi)
    f.note('fx', 14, 0, 24, 60, 0.16, s='riser')

    # ---- c: fight. The scarecrow: half time, the bass going down
    c = s.section('c', 16, next='b')
    prev = None
    for b in range(16):
        k = b % 8; sym, low = FALL[k]; g = ROOT[sym]; second = b >= 8
        riff(c, b, f'{g}*:6 {g}*:3 {g}:1 {g}:2', bass=False)
        c.note('bass', b, 0, 5.5, midi(low), 1.0); c.note('bass', b, 6, 2.6, midi(low), 0.85); c.note('bass', b, 9, 2.6, midi(low), 0.85)
        oom(c, b, sym, 0.85, low=low if midi(low) >= 34 else None)
        held(c, 'organ', b, sym, 0.8); held(c, 'choir', b, sym, 0.7 if not second else 0.9, lo=55, hi=68)
        c.hits('kick', b, 'x.........x.' if b % 2 == 0 else 'x....x....x.')
        c.hits('snare', b, '......x.....' if b != 15 else '......x..xxx')
        c.hits('hat', b, 'x..x..x..x..', v=0.8)
        c.hits('clave', b, '...x.x...x.x', v=0.6)
        prev = legato(c, 'ther', b, LANTERN[k], 1.0, most=12, prev=prev)
        if second: c.line('bones', b, LANTERN[k], 0.6)
        # the harpsichord climbs the chord into beats three and one
        for at in (3, 9):
            for n, m in enumerate(PAH[sym]): c.note('harpsi', b, at + n, 1, m, 0.55 + 0.08 * n)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.14, s='boom')
    c.note('fx', 0, 0, 1, 60, 0.3, s='thunder'); c.note('bell', 0, 0, 20, 53, 0.7); c.note('bell', 8, 0, 20, 53, 0.7)
    c.note('timp', 7, 6, 3, 45, 0.7); c.note('timp', 7, 9, 3, 45, 0.8)
    for n, semi in enumerate((7, 2, -5)): c.note('tom', 15, 9 + n, 1, 60, 0.8, semi=semi)
    c.note('fx', 14, 0, 24, 60, 0.16, s='riser')

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
