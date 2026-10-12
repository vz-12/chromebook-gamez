"""house: THE HOUSE, ALL HALLOWS chapter two (MUSIC-PLAN.md). An empty lobby: a house where every room
is a menu somebody left open, and the lights are on a timer that nobody is left to reset. Its tune is
DEAD GAME's title music heard from another room, on a music box and in three: a waltz. A timer ticks on
every beat. 144 BPM in three-four, G minor.

  intro  8 bars, once     a door, the wind, the timer; the music box is wound and tries its first phrase
  a      16 bars, calm    the music box alone with the timer, a plucked bass under it, a choir later
  a2     16 bars, calm    the tune's second strain, the theremin holding its long notes; at the end the
                          music box runs down, the timer stops, and a latch drops. (a winds it again)
  b      16 bars, fight   the dance: harpsichord over a tuba and an organ, drums in three; guitars and
                          the theremin join half-way
  c      16 bars, fight   the breakdown: half time, two bars to every slow one; the second strain on the
                          theremin over a cathedral organ, a choir and a bell; back into b
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, shift
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, organ
from scores._common import kit, hallows, riff, legato, theremin, musicbox, bones, harpsichord, pipes

TITLE = 'Lights on a Timer'
ORDER = ['intro', 'a', 'a2', 'b', 'c', 'b', 'a']

# DEAD GAME's theme in three: each of its bars is two here (a bar of 12: four to the beat)
WALTZ = [('G4:4 D5:4 Eb5:4', 'D5:8 Bb4:4'),
         ('Bb4:4 Eb5:4 G5:4', 'F5:4 Eb5:4 D5:4'),
         ('F5:4 D5:4 Bb4:4', 'D5:4 F5:4 Bb5:4'),
         ('A5:8 G5:4', 'F5:4 C5:4 A4:4'),
         ('G4:4 D5:4 Eb5:4', 'D5:2 Bb4:2 D5:4 G5:4'),
         ('G5:4 Eb5:4 Bb4:4', 'Eb5:4 G5:6 Bb5:2'),
         ('Eb5:4 G5:4 C6:4', 'Bb5:4 G5:4 Eb5:4'),
         ('D5:4 F#5:4 A5:4', 'C6:4 A5:4 F#5:4')]
WALTZ_CH = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D']
# and its second strain
ROOMS = [('Bb5:12', 'G5:4 Eb5:4 G5:4'),
         ('C6:12', 'A5:4 F5:4 A5:4'),
         ('D6:12', 'Bb5:8 G5:4'),
         ('D5:4 G5:4 Bb5:4', 'D6:8 Bb5:4'),
         ('Eb6:12', 'D6:4 Bb5:4 G5:4'),
         ('F6:12', 'Eb6:4 C6:4 A5:4'),
         ('F#5:4 A5:4 D6:4', 'D6:8 C6:4'),
         ('Bb5:4 A5:4 F#5:4', 'A5:12')]
ROOMS_CH = ['Eb', 'F', 'Gm', 'Gm', 'Eb', 'F', 'D', 'D']
ROOT = {'Gm': 'G2', 'Eb': 'Eb2', 'Bb': 'Bb1', 'F': 'F2', 'Cm': 'C2', 'D': 'D2'}
PAH = {'Gm': (55, 58, 62), 'Eb': (55, 58, 63), 'Bb': (58, 62, 65), 'F': (57, 60, 65), 'Cm': (55, 60, 63), 'D': (57, 62, 66)}

def song():
    K = kit(); H = hallows()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 144
    s = Song('house', 144, beats=3, steps=12, target=-12.0, ceil=-1.5, room=dict(decay=2.8, pre=0.025, bright=5600.0, dark=1400.0),
             echo=dict(time=beat, fb=0.32, taps=3), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.58, key=True, fx=[lambda x: clip(x, 0.7)]))     # its thud moved from E onto E flat
    s.add('snare', Bus(hit(K['snare_m']), gain=0.55, rev=0.16, fx=[lambda x: clip(x, 0.65)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.8, fx=[lambda x: clip(hp(x, 500.0), 0.35)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.24, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('tick', Bus(hit(H['tick'], human=0.002), gain=1.3, rev=0.12, fx=[lambda x: clip(hp(x, 700.0), 0.3)]))         # the lights' timer
    s.add('latch', Bus(hit(H['latch']), gain=0.4, rev=0.3, fx=[lambda x: hp(x, 300.0)]))
    s.add('timp', Bus(sampler(H['timp'], rel=0.5), gain=0.4, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    s.add('tuba', Bus(sampler(H['tuba'], rel=0.12), gain=0.6, rev=0.12, fx=[lambda x: clip(lp(peak(hp(x, 45.0), 240.0, 3.0, 1.0), 330.0), 0.7)]))
    s.add('low', Bus(sampler(H['low'], rel=0.25), gain=0.6, rev=0.2, fx=[lambda x: hp(x, 60.0)]))
    s.add('pizz', Bus(sampler(H['pizz'], rel=0.1), gain=0.5, rev=0.28, fx=[lambda x: hp(x, 150.0)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.3, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('box', Bus(musicbox(), gain=0.5, rev=0.35, dly=0.18, fx=[lambda x: hp(x, 400.0)]))
    s.add('harpsi', Bus(harpsichord(), gain=0.75, rev=0.24, dly=0.1, fx=[lambda x: clip(hp(x, 180.0), 0.5)]))
    s.add('bones', Bus(bones(), gain=0.3, rev=0.2, dly=0.12, fx=[lambda x: hp(x, 400.0)]))
    s.add('organ', Bus(organ(trem=0.25, tremhz=5.5), gain=0.3, rev=0.35, duck=0.15, fx=[lambda x: clip(hp(x, 110.0), 0.6)]))
    s.add('pipes', Bus(pipes(), gain=0.5, rev=0.35, duck=0.15, fx=[lambda x: hp(x, 100.0)]))                 # the cathedral organ, on the chords' roots
    s.add('ther', Bus(theremin(), gain=0.42, rev=0.38, dly=0.25, fx=[lambda x: hp(x, 250.0)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.5), gain=0.25, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('bell', Bus(sampler(H['bell'], rel=1.5), gain=0.4, rev=0.4, fx=[lambda x: hp(x, 150.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.5),
                           'wind': H['storm'], 'gust': shift(H['storm'], -4.0),
                           'door': shift(H['creak'], -7.0), 'stair': H['creak'],       # the same hinge: slowed, it is a heavier door
                           'windup': H['windup'], 'thunder': H['thunder']}),
                    gain=1.0, rev=0.3, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def held(sec, bus, bar, sym, v=1.0, lo=50, hi=65, dur=23.5):
        for m in chord(sym, 3):
            while m < lo: m += 12
            while m > hi: m -= 12
            sec.note(bus, bar, 0, dur, m, v)
    def pipe(sec, bar, sym, v=0.8, dur=23.5):
        sec.note('pipes', bar, 0, dur, root(sym) + 12, v, kind='minor' if sym.endswith('m') else 'fifth')
    def pah(sec, bus, bar, sym, v=0.7, dur=1.5):
        for at in (4, 8):
            for m in PAH[sym]: sec.note(bus, bar, at, dur, m, v * (1.0 if at == 4 else 0.9))
    def ticks(sec, bar, v=0.6): sec.hits('tick', bar, 'x...o...o...', v=v)
    def plucked(sec, bar, sym, v=0.6, fifth=False):
        r = root(sym) + 12
        sec.note('low', bar, 0, 4, r + (7 if fifth and r + 7 <= 57 else -5 if fifth else 0), v)

    # ---- intro: a door, the timer, the music box wound
    i = s.section('intro', 8, seg=4, loop=False, next='a', lock=True, level=5.0)
    i.note('fx', 0, 0, 1, 60, 0.34, s='door'); i.note('fx', 0, 0, 1, 60, 0.13, s='gust'); i.note('bell', 0, 0, 40, 58, 0.7)
    i.note('latch', 1, 4, 1, 60, 0.8)
    for b in range(2, 8): ticks(i, b, 0.5 + 0.03 * b)
    i.note('fx', 2, 0, 1, 60, 0.35, s='windup')
    for b in range(4, 8):
        sym = 'D' if b >= 6 else 'Gm'
        plucked(i, b, sym, 0.4); held(i, 'organ', b, sym, 0.2, lo=43, hi=58, dur=11.5)
    for h, text in enumerate(WALTZ[0]): i.line('box', 4 + h, text, 0.8, octave=1)
    i.line('box', 6, 'D5:4 F#5:4 A5:4', 0.8, octave=1); i.line('box', 7, 'A5:12', 0.85, octave=1)
    i.note('timp', 7, 0, 8, 38, 0.45); i.note('fx', 7, 4, 4, 60, 0.3, s='stair')

    # ---- a: calm. The music box and the timer
    a = s.section('a', 16, seg=4, next='a2', level=3.5)
    for u in range(8):
        sym = WALTZ_CH[u]; b = u * 2
        for h, text in enumerate(WALTZ[u]):
            a.line('box', b + h, text, 0.9, octave=1)
            ticks(a, b + h, 0.6); plucked(a, b + h, sym, 0.45, fifth=(h == 1))
            if u >= 2: pah(a, 'pizz', b + h, sym, 0.34)
        if u >= 4: held(a, 'choir', b, sym, 0.45, lo=55, hi=68)
    a.note('fx', 0, 0, 1, 60, 0.4, s='windup'); a.note('bell', 0, 0, 40, 58, 0.6)
    a.note('fx', 4, 0, 1, 60, 0.16, s='wind'); a.note('fx', 9, 4, 4, 60, 0.22, s='stair'); a.note('fx', 12, 0, 1, 60, 0.14, s='gust')

    # ---- a2: calm. The second strain; and the music box runs down
    e = s.section('a2', 16, seg=4, next='a', level=1.0)
    prev = None
    for u in range(8):
        sym = ROOMS_CH[u]; b = u * 2; down = u == 7
        for h, text in enumerate(ROOMS[u]):
            if not down:
                e.line('box', b + h, text, 1.2); ticks(e, b + h, 0.6); pah(e, 'pizz', b + h, sym, 0.36)
            plucked(e, b + h, sym, 0.6, fifth=(h == 1))
            prev = legato(e, 'ther', b + h, text, 0.42, most=12, prev=prev)
        held(e, 'choir', b, sym, 0.6, lo=55, hi=68); held(e, 'organ', b, sym, 0.3, lo=43, hi=58)
    # running down: the same last phrase, each note later than it should be; then the timer stops
    for at, p in ((0, 'Bb5'), (4.6, 'A5'), (10.2, 'F#5'), (17.5, 'A5')): e.note('box', 14, at, 4, midi(p), 0.8 - 0.02 * at)
    e.hits('tick', 14, 'x...o...o...', v=0.55); e.hits('tick', 15, 'x...........', v=0.5)
    e.note('latch', 15, 8, 1, 60, 0.9)
    e.note('bell', 0, 0, 40, 58, 0.6); e.note('fx', 6, 0, 1, 60, 0.16, s='wind'); e.note('fx', 11, 2, 4, 60, 0.26, s='door')

    # ---- b: fight. The dance
    f = s.section('b', 16, seg=4, next='c', level=1.5)
    prev = None
    for u in range(8):
        sym = WALTZ_CH[u]; b = u * 2; second = u >= 4; g = ROOT[sym]
        for h, text in enumerate(WALTZ[u]):
            bb = b + h
            f.line('harpsi', bb, text, 1.0); f.line('box', bb, text, 0.8, octave=1)
            f.note('harpsi', bb, 0, 3, root(sym) + 12, 0.8)        # the left hand, on one
            f.note('tuba', bb, 0, 3, root(sym) if h == 0 else (root(sym) + 7 if root(sym) + 7 <= 46 else root(sym) - 5), 0.85)
            f.note('bass', bb, 0, 9, root(sym), 0.55)
            pah(f, 'organ', bb, sym, 0.95, dur=2.2); ticks(f, bb, 0.5)
            f.hits('kick', bb, 'x...........' if h == 0 else 'x.........x.')
            f.hits('snare', bb, '........x...' if bb != 15 else '....x...x.xx')
            f.hits('hat', bb, 'x.x.x.x.x.x.', v=0.85)
            if second:
                riff(f, bb, f'{g}*:4 {g}:2 {g}:2 {g}:2 {g}:2', bass=False)
                f.line('bones', bb, text, 0.7)
                prev = legato(f, 'ther', bb, text, 0.6, most=12, prev=prev)
    for b in (0, 8): f.note('crash', b, 0, 1, 60, 1.0 if b == 8 else 0.8); f.note('fx', b, 0, 1, 60, 0.14, s='boom'); pipe(f, b, 'Gm', 0.6, dur=10)
    f.note('fx', 14, 0, 24, 60, 0.16, s='riser')

    # ---- c: fight. The breakdown: two bars to every slow one
    c = s.section('c', 16, seg=4, next='b', level=-1.0)
    prev = None
    for u in range(8):
        sym = ROOMS_CH[u]; b = u * 2; second = u >= 4; g = ROOT[sym]
        riff(c, b, f'{g}*:12', bass=False); riff(c, b + 1, f'{g}:2 {g}:2 {g}*:4 {g}:2 {g}:2', bass=False)
        c.note('bass', b, 0, 11, root(sym), 1.0)
        for n in range(3): c.note('bass', b + 1, n * 4, 3.4, root(sym), 0.85)
        c.note('tuba', b, 0, 3, root(sym), 0.9)
        pipe(c, b, sym, 0.85); held(c, 'organ', b, sym, 0.5, lo=43, hi=62); held(c, 'choir', b, sym, 0.8 if not second else 0.95, lo=55, hi=68)
        c.hits('kick', b, 'x.........x.'); c.hits('kick', b + 1, '......x...x.')
        c.hits('snare', b + 1, 'x...........' if b + 1 != 15 else 'x...x...x.xx')
        c.hits('china', b, 'x...x...x...', v=0.6); c.hits('china', b + 1, 'x...x...x...', v=0.6)
        c.note('timp', b, 0, 8, 38 if sym == 'D' else root(sym) % 12 + 36, 0.7)
        for h, text in enumerate(ROOMS[u]):
            prev = legato(c, 'ther', b + h, text, 1.0, most=12, prev=prev)
            c.line('harpsi', b + h, text, 0.8)
            if second: c.line('bones', b + h, text, 0.6)
            ticks(c, b + h, 0.5)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.16, s='boom'); c.note('bell', b, 0, 40, 58, 0.8)
    c.note('fx', 0, 0, 1, 60, 0.3, s='thunder'); c.note('fx', 14, 0, 24, 60, 0.16, s='riser')

    s.moods = {'calm': ['a', 'a2'], 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
