"""yard: THE YARD, ALL HALLOWS chapter three (MUSIC-PLAN.md). A graveyard of runs, at night: every stone
is one run that was quit, with its wave, its hull and the last thing typed in it, and he buries them
himself. So the tune never gets its last bar. Each time round it stops a bar short, on the note that
wants to go home, and the bell is struck where the ending would have been: a stone instead of an
ending. The bell is a church bell on C, and rings a C minor chord of its own (big bells sound their
minor third), so it is the home chord the tune never reaches. THE RAGE QUIT's song is this tune twice
as fast, and only in his last quarter does it get to the end. 90 BPM, C minor.

  intro  4 bars, once   the gate, the wind, a bell; someone digging; the organ's first four notes
  a      8 bars, calm   the dirge: the tune on a chapel organ over a funeral drum and the spade; a stone
  a2     8 bars, calm   the tune again on a cello, the choir behind it, a crow; a stone
  a3     8 bars, calm   its second strain on the theremin, the lower bell under it; a stone. (back to a)
  b      8 bars, fight  doom: the tune on the full organ over guitars held on every root; at the missing
                        bar the band stops dead and only the bell and the choir are left
  b2     8 bars, fight  the same, with both feet and the risen's choir climbing out under it
  c      8 bars, fight  the second strain over the pace of THE RAGE QUIT's (twice this one): tremolo
                        guitars, the spade on the snare
  c2     8 bars, fight  everything, and both bells at the stone. (back to b)
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, shift
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, organ
from scores._common import kit, hallows, yard, void, page, riff, trem, legato, theremin, pipes, tomfill, move

TITLE = 'Plot Holes'
ORDER = ['intro', 'a', 'a2', 'a3', 'b', 'b2', 'c', 'c2', 'a']

# the tune, a bar a line, in 16ths. Its first four notes are the ones every ALL HALLOWS track opens on.
# The yard never plays its last bar: that is where the stone goes.
THEME = ['C5:4 G5:4 Ab5:6 G5:2',
         'F5:4 Eb5:4 D5:4 Bb4:4',
         'Eb5:4 G5:4 Ab5:6 C6:2',
         'Bb5:8 G5:8',
         'Ab5:6 G5:2 F5:4 C5:4',
         'D5:4 F5:4 Bb5:6 Ab5:2',
         'G5:4 Eb5:4 D5:4 B4:4',
         'C5:16']
THEME_CH = ['Cm', 'Bb', 'Ab', 'Eb', 'Fm', 'Bb', 'G', 'Cm']
# its second strain: what is cut on the stones
EPITAPH = ['Eb6:6 D6:2 C6:4 Ab5:4',
           'Bb5:6 Ab5:2 G5:8',
           'C6:6 Bb5:2 Ab5:4 F5:4',
           'D5:4 F5:4 G5:8',
           'Eb6:6 F6:2 Eb6:4 C6:4',
           'D6:6 C6:2 Bb5:4 F5:4',
           'Eb6:4 D6:4 C6:4 B5:4',
           'C6:16']
EPITAPH_CH = ['Ab', 'Eb', 'Fm', 'G', 'Ab', 'Bb', 'G', 'Cm']
ROOT = {'Cm': 'C2', 'Bb': 'Bb1', 'Ab': 'Ab1', 'Eb': 'Eb2', 'Fm': 'F2', 'G': 'G1'}
GTR = {'Cm': 'C2', 'Bb': 'Bb1', 'Ab': 'Ab1', 'Eb': 'Eb2', 'Fm': 'F2', 'G': 'G1'}
DOOM = {'Cm': 'C3', 'Bb': 'Bb2', 'Ab': 'Ab2', 'Eb': 'Eb3', 'Fm': 'F2', 'G': 'G2'}     # the held guitar, on each root
TUBA = {'Cm': 'C2', 'Bb': 'Bb1', 'Ab': 'Ab1', 'Eb': 'Eb2', 'Fm': 'F2', 'G': 'G1'}

def song():
    K = kit(); H = hallows(); Y = yard(); V = void(); P = page()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 90
    s = Song('yard', 90, target=-12.0, ceil=-1.5, room=dict(decay=3.4, pre=0.03, bright=5200.0, dark=1200.0),
             echo=dict(time=beat * 0.75, fb=0.3, taps=3), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.6, key=True, fx=[lambda x: clip(x, 0.7)]))     # its thud moved from E onto E flat
    s.add('dkick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.5, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.6, rev=0.2, fx=[lambda x: clip(x, 0.65)]))               # it rings on G: the fifth here
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.75, fx=[lambda x: clip(hp(x, 500.0), 0.35)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.32, rev=0.25, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.26, rev=0.18, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.25, fx=[lambda x: clip(x, 0.7)]))
    s.add('ltom', Bus(hit(K['tom_lo']), gain=0.5, rev=0.3, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.6), gain=0.55, rev=0.32, fx=[lambda x: clip(x, 0.6)]))   # the funeral drum
    s.add('spade', Bus(hit(Y['spade'], human=0.004), gain=0.85, rev=0.22, fx=[lambda x: clip(hp(x, 120.0), 0.5)]))   # someone digging
    s.add('bell', Bus(sampler(Y['bell'], rel=2.5), gain=0.5, rev=0.4, fx=[lambda x: hp(x, 120.0)]))      # the stone: a C minor chord by itself
    s.add('bigbell', Bus(sampler(Y['bigbell'], rel=2.0), gain=0.45, rev=0.4, fx=[lambda x: hp(x, 70.0)]))
    s.add('tuba', Bus(sampler(H['tuba'], rel=0.14), gain=0.55, rev=0.15, fx=[lambda x: clip(lp(peak(hp(x, 40.0), 220.0, 3.0, 1.0), 330.0), 0.7)]))
    s.add('flue', Bus(organ(ranks=((1, 1.0), (2, 0.35), (4, 0.1)), chiff=0.14, trem=0.22, tremhz=5.4), gain=0.36, rev=0.42, dly=0.12,
                      fx=[lambda x: hp(x, 150.0)]))                                                        # the chapel organ, soft
    s.add('organ', Bus(organ(trem=0.0), gain=0.44, rev=0.36, duck=0.12, fx=[lambda x: clip(hp(x, 110.0), 0.6)]))   # and all its stops out
    s.add('pipes', Bus(pipes(), gain=0.5, rev=0.38, duck=0.15, fx=[lambda x: hp(x, 90.0)]))               # the cathedral organ, on the chords' roots
    s.add('choir', Bus(sampler(H['choir'], rel=0.6), gain=0.27, rev=0.55, duck=0.2, fx=[lambda x: hp(x, 170.0)]))
    s.add('cello', Bus(sampler(P['cello'], rel=0.35), gain=0.5, rev=0.38, dly=0.1, fx=[lambda x: hp(x, 70.0)]))
    s.add('ther', Bus(theremin(), gain=0.42, rev=0.42, dly=0.25, fx=[lambda x: hp(x, 250.0)]))
    s.add('doom', Bus(sampler(Y['doom'], rel=0.35), gain=0.34, rev=0.1, duck=0.18, fx=[lambda x: clip(hp(x, 60.0), 0.85)]))   # held power chords
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.28, rev=0.06, duck=0.15, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=450.0, env=2.2, fdecay=0.12, res=1.0,
                            track=0.3, a=0.004, d=0.12, s=0.8, r=0.06, dirt=0.75),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 38.0), 700.0, 2.5, 1.0), 0.75)]))
    crows = {f'crow{k}': c for k, c in enumerate(H['crow'])}
    s.add('fx', Bus(clips({'boom': boom(secs=2.8), 'riser': riser(2 * s.bar, lo=200.0, hi=7000.0), 'rev': reverse(K['crash'], 1.6),
                           'gate': shift(Y['gate'], -2.0), 'wind': H['storm'], 'gust': shift(H['storm'], -4.0),
                           'thunder': H['thunder'], 'risen': V['swell'], **crows}),
                    gain=1.0, rev=0.32, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def held(sec, bus, bar, sym, v=1.0, lo=50, hi=65, at=0, dur=15.5):
        for m in chord(sym, 3):
            while m < lo: m += 12
            while m > hi: m -= 12
            sec.note(bus, bar, at, dur, m, v)
    def pipe(sec, bar, sym, v=0.8, dur=15.5):
        sec.note('pipes', bar, 0, dur, root(sym) + 12, v, kind='minor' if sym.endswith('m') else 'fifth')
    def march(sec, bar, sym, v=1.0):
        """The dead march: the kettledrum on one, and a soft dotted 'da-dum' into the next bar; the spade on three."""
        r = root(sym)
        sec.note('timp', bar, 0, 8, r if r >= 31 else r + 12, 0.8 * v)
        sec.hits('ltom', bar, '............x..o', v=0.45 * v)
        sec.note('spade', bar, 8, 4, 60, 0.75 * v)
    def oom(sec, bar, sym, v=0.7):
        """The tuba, on one and three: the root, then the fifth below it."""
        r = midi(TUBA[sym])
        sec.note('tuba', bar, 0, 3, r, v); sec.note('tuba', bar, 8, 3, r + 7 if r + 7 <= 46 else r - 5, v * 0.85)
    def stone(sec, bar, v=1.0, big=False):
        """Where the last bar would be: the bell, the home chord held under it, and nothing else."""
        sec.note('bell', bar, 0, 40, 72, 0.9 * v)
        if big: sec.note('bigbell', bar, 0, 40, midi('Eb3'), 0.8 * v)
        held(sec, 'choir', bar, 'Cm', 0.7 * v, lo=55, hi=68); pipe(sec, bar, 'Cm', 0.7 * v)
        sec.note('timp', bar, 0, 16, 36, 0.6 * v)

    # ---- intro: the gate, the wind, a bell; someone digging; the organ's first four notes
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=4.0)
    i.note('fx', 0, 0, 1, 60, 0.32, s='gate'); i.note('fx', 0, 0, 1, 60, 0.14, s='gust'); i.note('bigbell', 0, 4, 40, midi('Eb3'), 0.5)
    for b in (1, 2, 3):
        i.note('spade', b, 0, 4, 60, 0.55); i.note('spade', b, 8, 4, 60, 0.6)
        pipe(i, b, 'Cm', 0.25 + 0.1 * b)
    i.line('flue', 2, THEME[0], 0.75)
    i.line('flue', 3, 'F5:4 Eb5:4 D5:4 B4:4', 0.7); held(i, 'choir', 3, 'G', 0.5, lo=55, hi=67)
    i.note('fx', 1, 8, 1, 60, 0.4, s='crow2'); i.note('fx', 3, 0, 1, 60, 0.3, s='risen')
    i.note('timp', 3, 0, 8, 43, 0.5); i.note('timp', 3, 8, 8, 43, 0.6)

    # ---- a: calm. The dirge on the chapel organ; a stone
    a = s.section('a', 8, seg=4, next='a2', level=3.5)
    for k in range(8):
        sym = THEME_CH[k]
        if k == 7: stone(a, k, 0.85); continue
        a.line('flue', k, THEME[k], 0.95)
        march(a, k, sym, 0.85); oom(a, k, sym, 0.6)
        if k >= 2: held(a, 'choir', k, sym, 0.42, lo=55, hi=68)
        pipe(a, k, sym, 0.35)
    a.note('fx', 0, 0, 1, 60, 0.14, s='wind'); a.note('fx', 4, 8, 1, 60, 0.3, s='crow0')

    # ---- a2: calm. The tune again on the cello, the choir behind it; a stone
    e = s.section('a2', 8, seg=4, next='a3', level=3.0)
    for k in range(8):
        sym = THEME_CH[k]
        if k == 7: stone(e, k, 0.85); continue
        e.line('cello', k, move(THEME[k], -12), 0.95)
        held(e, 'flue', k, sym, 0.5, lo=55, hi=67); held(e, 'choir', k, sym, 0.55, lo=55, hi=68)
        march(e, k, sym, 0.8); oom(e, k, sym, 0.55); pipe(e, k, sym, 0.4)
    e.note('fx', 2, 0, 1, 60, 0.3, s='crow3'); e.note('fx', 5, 0, 1, 60, 0.13, s='gust')

    # ---- a3: calm. The second strain, on the theremin; the lower bell under it; a stone
    t = s.section('a3', 8, seg=4, next='a', level=2.5)
    prev = None
    for k in range(8):
        sym = EPITAPH_CH[k]
        if k == 7: stone(t, k, 0.9, big=True); continue
        prev = legato(t, 'ther', k, EPITAPH[k], 0.55, most=12, prev=prev)
        held(t, 'flue', k, sym, 0.45, lo=55, hi=67); held(t, 'choir', k, sym, 0.5, lo=55, hi=68)
        t.note('cello', k, 0, 15.5, root(sym) + 24 if root(sym) + 24 <= 62 else root(sym) + 12, 0.5)
        march(t, k, sym, 0.75); pipe(t, k, sym, 0.4)
    t.note('bigbell', 0, 0, 40, midi('Eb3'), 0.5); t.note('bigbell', 4, 0, 40, midi('Eb3'), 0.45)
    t.note('fx', 1, 8, 1, 60, 0.28, s='crow1'); t.note('fx', 3, 0, 1, 60, 0.14, s='wind')

    # ---- the fights. A bar of the band, with the tune over it
    def band(sec, bar, sym, both=False, v=1.0):
        g = GTR[sym]
        riff(sec, bar, f'{g}*:4 {g}:2 {g}:2 {g}*:4 {g}:1 {g}:1 {g}:2')
        sec.note('doom', bar, 0, 15.5, midi(DOOM[sym]), 0.9 * v)
        sec.hits('kick', bar, 'x.....x.x.......'); sec.hits('snare', bar, '....x.......x...')
        sec.hits('hat', bar, 'x.x.x.x.x.x.x.x.', v=0.75)
        if both: sec.hits('dkick', bar, 'xoxoxoxoxoxoxoxo', v=0.8, len=0.1)
        pipe(sec, bar, sym, 0.7)
    def dead(sec, bar, both=False):
        """The stone in a fight: one blow on the home chord, then the band is gone and the bell is left."""
        stone(sec, bar, 1.0, big=both)
        sec.hits('crash', bar, 'x...............'); sec.hits('kick', bar, 'x...............')
        riff(sec, bar, 'C2*:8 r:8'); sec.note('doom', bar, 0, 8, midi('C3'), 1.0)
        sec.note('fx', bar, 0, 1, 60, 0.2, s='boom'); tomfill(sec, bar, 12)

    # ---- b: fight. Doom
    f = s.section('b', 8, seg=4, next='b2', level=1.0)
    for k in range(8):
        sym = THEME_CH[k]
        if k == 7: dead(f, k); continue
        band(f, k, sym)
        f.line('organ', k, THEME[k], 1.0); held(f, 'choir', k, sym, 0.75, lo=55, hi=68)
    f.note('crash', 0, 0, 1, 60, 1.0); f.note('china', 4, 0, 1, 60, 0.8)
    f.note('fx', 6, 0, 32, 60, 0.15, s='riser')

    # ---- b2: fight. Both feet; the risen climb out
    g2 = s.section('b2', 8, seg=4, next='c', level=1.0)
    for k in range(8):
        sym = THEME_CH[k]
        if k == 7: dead(g2, k, both=True); continue
        band(g2, k, sym, both=True)
        g2.line('organ', k, THEME[k], 1.0); g2.line('flue', k, THEME[k], 0.6, octave=-1)
        held(g2, 'choir', k, sym, 0.9, lo=55, hi=68)
        g2.hits('china', k, 'x.......x.......', v=0.55)
    g2.note('crash', 0, 0, 1, 60, 1.0); g2.note('fx', 0, 0, 1, 60, 0.3, s='risen'); g2.note('fx', 4, 0, 1, 60, 0.3, s='risen')
    g2.note('fx', 0, 0, 1, 60, 0.18, s='boom'); g2.note('fx', 6, 0, 32, 60, 0.16, s='riser')

    # ---- c: fight. The second strain over THE RAGE QUIT's pace
    def drive(sec, bar, sym, v=1.0):
        g = GTR[sym]
        trem(sec, bar, g)
        sec.hits('kick', bar, 'x...x...x...x...'); sec.hits('dkick', bar, '..x...x...x...x.', v=0.7, len=0.1)
        sec.hits('snare', bar, '..x...x...x...x.')
        sec.hits('spade', bar, '..x.......x.....', v=0.5)
        sec.hits('hat', bar, 'xxxxxxxxxxxxxxxx', v=0.6)
        pipe(sec, bar, sym, 0.75)
    c = s.section('c', 8, seg=4, next='c2', level=0.0)
    prev = None
    for k in range(8):
        sym = EPITAPH_CH[k]
        if k == 7: dead(c, k); continue
        drive(c, k, sym)
        c.line('organ', k, EPITAPH[k], 1.0); held(c, 'choir', k, sym, 0.8, lo=55, hi=68)
        prev = legato(c, 'ther', k, EPITAPH[k], 0.4, most=12, prev=prev)
    c.note('crash', 0, 0, 1, 60, 1.0); c.note('crash', 4, 0, 1, 60, 0.7); c.note('fx', 0, 0, 1, 60, 0.3, s='thunder')
    c.note('fx', 6, 0, 32, 60, 0.15, s='riser')

    # ---- c2: fight. Everything, and both bells at the stone
    d = s.section('c2', 8, seg=4, next='b', level=0.0)
    prev = None
    for k in range(8):
        sym = EPITAPH_CH[k]
        if k == 7: dead(d, k, both=True); continue
        drive(d, k, sym)
        d.note('doom', k, 0, 15.5, midi(DOOM[sym]), 0.8)
        d.line('organ', k, EPITAPH[k], 1.0); d.line('flue', k, EPITAPH[k], 0.55, octave=-1)
        held(d, 'choir', k, sym, 0.95, lo=55, hi=68)
        prev = legato(d, 'ther', k, EPITAPH[k], 0.5, most=12, prev=prev)
        d.hits('china', k, 'x...x...x...x...', v=0.5)
    d.note('crash', 0, 0, 1, 60, 1.0); d.note('fx', 0, 0, 1, 60, 0.2, s='boom'); d.note('fx', 0, 0, 1, 60, 0.3, s='risen')
    d.note('fx', 6, 0, 32, 60, 0.16, s='riser')

    s.moods = {'calm': ['a', 'a2', 'a3'], 'fight': ['b', 'b2', 'c', 'c2']}
    s.start = 'intro'
    return s
