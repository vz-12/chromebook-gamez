"""foundry: THE FOUNDRY, sector 02 (MUSIC-PLAN.md). Industrial: anvils where a snare would be, hammer
strikes for hats, steam, a distorted bass, and a tune that works like a machine: every bar the same
3 + 3 + 2, 3 + 3 + 2. 132 BPM, D minor.

  intro  4 bars, once     the plant starting up: a low strike, steam, the hammers finding the beat
  a      16 bars, calm    the shop floor at half pace: anvil on two and four, the tune on struck metal
  b      16 bars, fight   the line at full speed: the tune on the whistle, guitars locked to the hammers,
                          brass on the accents second time round
  c      16 bars, fight   the answer, half time and heavy, horns under it; falls back into b

Nearest reference: The Filthy Mind (the most percussive of the area tracks; D minor).
"""
import math
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, drive
from inst import hit, synth, keys, guitar, amp, sampler, clips, riser, reverse, boom, steam
from scores._common import third, kit, forge, riff, tomfill

TITLE = 'The Line Never Stops'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the tune: a bar a line, every bar hammering 3 + 3 + 2 twice
TUNE = ['D5:3 D5:3 F5:2 E5:3 D5:3 A4:2',
        'D5:3 D5:3 A5:2 G5:3 F5:3 E5:2',
        'F5:3 F5:3 A5:2 G5:3 F5:3 C5:2',
        'E5:3 E5:3 G5:2 F5:3 E5:3 C5:2',
        'D5:3 D5:3 F5:2 E5:3 D5:3 A4:2',
        'D5:3 D5:3 A5:2 C6:3 A5:3 G5:2',
        'F5:3 F5:3 Bb5:2 A5:3 G5:3 F5:2',
        'E5:3 E5:3 A5:2 G5:3 E5:3 C#5:2']
TUNE_CH = ['Dm', 'Dm', 'F', 'C', 'Dm', 'Dm', 'Bb', 'A']
# its answer: long notes falling through each chord, up to the dominant and a run back down to D
REPLY = ['A5:6 F5:2 C5:4 F5:4',
         'G5:6 E5:2 C5:4 E5:4',
         'Bb5:6 G5:2 D5:4 G5:4',
         'A5:8 F5:4 D5:4',
         'D6:6 Bb5:2 F5:4 Bb5:4',
         'C6:6 G5:2 E5:4 G5:4',
         'A5:4 C#6:4 E6:8',
         'E6:2 C#6:2 A5:2 E5:2 C#5:2 E5:2 A5:2 C#6:2']
REPLY_CH = ['F', 'C', 'Gm', 'Dm', 'Bb', 'C', 'A', 'A']
BASS = {'Dm': 'D2', 'F': 'F2', 'C': 'C2', 'Bb': 'Bb1', 'A': 'A1', 'Gm': 'G1'}
GTR = {'Dm': 'D2', 'F': 'F2', 'C': 'C3', 'Bb': 'Bb2', 'A': 'A2', 'Gm': 'G2'}
ACC = (0, 3, 6, 8, 11, 14)        # the accents of 3 + 3 + 2, twice

def song():
    K = kit(); F = forge()
    s = Song('foundry', 132, target=-12.0, ceil=-1.5, room=dict(decay=2.0, pre=0.02, bright=5500.0, dark=1400.0),
             master=lambda x: highshelf(hp(x, 30.0), 8500.0, -2.5))
    s.add('kick', Bus(hit(F['kick']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(F['snare']), gain=0.66, rev=0.14, fx=[lambda x: clip(x, 0.7)]))
    s.add('anvil', Bus(hit(F['anvil'], human=0.002), gain=0.7, rev=0.3, fx=[lambda x: hp(x, 250.0)]))
    s.add('tick', Bus(hit(F['tick'], human=0.003), gain=0.42, rev=0.1, fx=[lambda x: hp(x, 700.0)]))
    s.add('hat', Bus(hit(K['hats'], human=0.003), gain=0.34, fx=[lambda x: hp(x, 600.0)]))
    s.add('crash', Bus(hit(K['china']), gain=0.2, rev=0.2, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.5, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('bass', Bus(synth('saw', voices=3, detune=0.16, spread=0.0, sq=0.4, cutoff=460.0, env=3.0, fdecay=0.1, res=1.1,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.04, dirt=0.9),
                      gain=0.27, duck=0.5, fx=[lambda x: peak(hp(x, 40.0), 700.0, 3.0, 1.0)]))
    s.add('gtr', Bus(guitar(K['chugs'], K['chords'], wide=0.6), gain=0.3, rev=0.05, duck=0.15, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('lead', Bus(synth('square', pw=0.3, voices=2, detune=0.1, spread=0.35, sq=0.0, cutoff=2600.0, env=1.4, fdecay=0.16, res=1.4,
                            a=0.004, d=0.14, s=0.7, r=0.09, vib=0.08, dirt=0.4),
                      gain=0.18, dly=0.22, rev=0.2, duck=0.12, fx=[lambda x: hp(x, 250.0)]))
    s.add('iron', Bus(keys(ratio=2.76, index=2.6, decay=0.7, spread=0.45), gain=0.3, dly=0.3, rev=0.4, fx=[lambda x: hp(x, 300.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.18, spread=1.0, cutoff=700.0, track=0.2, a=0.25, d=0.5, s=0.9, r=0.4),
                     gain=0.2, rev=0.45, duck=0.5, fx=[lambda x: hp(x, 150.0)]))
    s.add('stab', Bus(sampler(F['stab'], rel=0.06), gain=0.52, rev=0.25, fx=[lambda x: hp(x, 120.0)]))
    s.add('horn', Bus(sampler(F['horn'], rel=0.25), gain=0.62, rev=0.35, duck=0.2, fx=[lambda x: hp(x, 90.0)]))
    s.add('fx', Bus(clips({'boom': boom(), 'riser': riser(2 * s.bar, lo=200.0, hi=6000.0, tone=73.4), 'short': riser(s.bar, lo=500.0),
                           'rev': reverse(K['crash'], 1.5), 'steam': steam(0.4), 'puff': steam(0.16, 3500.0, 8000.0, 9),
                           'clang': F['clang'][0], 'clang2': F['clang'][-1], 'low': F['low']}), gain=1.0, rev=0.25))

    def bass(sec, bar, sym, mode):
        r = midi(BASS[sym])
        if mode == 'pulse':                       # eighths, shut down
            for i in range(8): sec.note('bass', bar, i * 2, 1.6, r, 0.7 if i % 2 == 0 else 0.58, open=0.6)
        elif mode == 'line':                      # sixteenths, the octave on every accent
            for i in range(16): sec.note('bass', bar, i, 0.9, r + (12 if i in ACC else 0), 1.0 if i in ACC else 0.8)
        else:                                     # held, pushed again on the off beats
            for at, d in ((0, 5.5), (6, 3.5), (10, 5.5)): sec.note('bass', bar, at, d, r, 1.0)
    def pad(sec, bar, sym, v=1.0): sec.chordn('pad', bar, 0, 15.5, sym, 3, v)
    def machine(sec, bar, sym, v=1.0):
        """Guitars locked to the hammers: mutes on every sixteenth, a chord on each accent."""
        g = GTR[sym]
        riff(sec, bar, ' '.join(f'{g}*:1 {g}:1 {g}:1 {g}*:1 {g}:1 {g}:1 {g}*:1 {g}:1' for _ in range(2)), bass=False)
    def near(sym, centre):
        """The chord's root in the octave nearest a recording's own pitch (lower on a tie: brass pitched
        down sounds like a bigger horn, pitched up like a toy)."""
        p = midi(GTR[sym]) % 12
        return min((p + 12 * o for o in range(2, 6)), key=lambda m: (abs(m - centre), m))
    def brass(sec, bar, sym, v=1.0):
        r = near(sym, 47.0)
        for at in ACC:
            sec.note('stab', bar, at, 1.6, r, v * (1.0 if at in (0, 8) else 0.8)); sec.note('stab', bar, at, 1.6, r - 5, v * 0.7)   # the fifth, below

    # ---- intro: the plant starting up
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    i.note('fx', 0, 0, 1, 60, 0.5, s='low'); i.note('fx', 0, 0, 1, 60, 0.3, s='boom')
    for b in range(4):
        pad(i, b, 'Dm', 0.6 + 0.12 * b)
        i.note('bass', b, 0, 15, midi('D2'), 0.5, open=0.4 + 0.2 * b)
        i.note('fx', b, 14, 2, 60, 0.3 + 0.08 * b, s='steam')
    i.hits('tick', 1, 'x.......x.......', v=0.7); i.hits('tick', 2, 'x...x...x...x...', v=0.8); i.hits('tick', 3, 'x.x.x.x.x.x.xxxx', v=0.9)
    i.hits('anvil', 2, '....x.......x...', v=0.7); i.hits('anvil', 3, '....x.......x.x.', v=0.85)
    i.hits('kick', 3, 'x...x...x...x...', v=0.85)
    i.note('fx', 2, 0, 32, 60, 0.3, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.4, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- a: calm. The shop floor at half pace
    a = s.section('a', 16, level=-3.5)
    for b in range(16):
        sym = TUNE_CH[b % 8]
        pad(a, b, sym); bass(a, b, sym, 'pulse')
        a.hits('kick', b, 'x.........x.....' if b % 2 == 0 else 'x.....x...x.....')
        a.hits('anvil', b, '....x.......x...', v=1.0)
        a.hits('tick', b, 'X..x..x.X..x..x.' if b < 8 else 'X.xx.xx.X.xx.xx.', v=0.75)
        if b % 2 == 1: a.note('fx', b, 14, 2, 60, 0.35, s='steam')
        if b % 4 == 2: a.note('fx', b, 6, 2, 60, 0.22, s='puff')
    a.note('fx', 0, 0, 1, 60, 0.3, s='clang'); a.note('fx', 0, 0, 1, 60, 0.16, s='boom')
    for b, text in [(0, 'D5:3 D5:3 F5:10'), (2, 'F5:3 F5:3 A5:10'), (4, 'D5:3 D5:3 F5:10'), (6, 'F5:3 F5:3 Bb5:10')]:
        a.line('iron', b, text, 0.8)
    for b in range(8):
        a.line('iron', 8 + b, TUNE[b], 0.85)
        a.line('lead', 8 + b, TUNE[b], 0.4)
    a.note('fx', 8, 0, 1, 60, 0.22, s='clang2')
    tomfill(a, 15); a.note('fx', 15, 15.99, 1, 60, 0.3, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- b: fight. The line at full speed
    f = s.section('b', 16, next='c')
    for b in range(16):
        sym = TUNE_CH[b % 8]
        bass(f, b, sym, 'line'); machine(f, b, sym); pad(f, b, sym, 0.7)
        f.hits('kick', b, 'x..x..x.x..x..x.')
        f.hits('snare', b, '....x.......x...' if b != 15 else '....x.......xxxx')
        f.hits('tick', b, 'xoxoxoxoxoxoxoxo', v=0.8)
        f.hits('hat', b, '..x...x...x...x.', v=0.8)
        f.hits('anvil', b, '......x.......x.' if b % 2 == 0 else '......x...x...x.', v=0.75)
        f.line('lead', b, TUNE[b % 8], 1.0)
        if b >= 8:
            f.line('lead', b, third(TUNE[b % 8], 'D'), 0.5); brass(f, b, sym, 0.8)
    for b in (0, 4, 8, 12): f.note('crash', b, 0, 1, 60, 1.0 if b in (0, 8) else 0.65)
    f.note('fx', 0, 0, 1, 60, 0.18, s='boom'); f.note('fx', 0, 0, 1, 60, 0.2, s='clang'); f.note('fx', 8, 0, 1, 60, 0.18, s='clang2')
    for b in (3, 7, 11): f.note('fx', b, 14, 2, 60, 0.3, s='steam')
    f.note('fx', 15, 0, 16, 60, 0.28, s='short'); tomfill(f, 15, 8)

    # ---- c: fight. The answer, half time and heavy
    c = s.section('c', 16, next='b')
    for b in range(16):
        sym = REPLY_CH[b % 8]; g = GTR[sym]
        bass(c, b, sym, 'held'); pad(c, b, sym, 1.0)
        riff(c, b, f'{g}*:6 {g}:1 {g}:1 {g}*:4 {g}:1 {g}:1 {g}:1 {g}:1', bass=False)
        c.hits('kick', b, 'x.....x...x.....')
        c.hits('snare', b, '........x.......' if b != 15 else '........x...xxxx')
        c.hits('anvil', b, '....x.......x...' if b % 2 == 0 else '....x.......x.xx', v=0.8)
        c.hits('tick', b, 'x.x.x.x.x.x.x.x.', v=0.8)
        c.note('horn', b, 0, 14, near(sym, 45.0), 0.8)
        c.line('lead', b, REPLY[b % 8], 1.0)
        if b >= 8: c.line('lead', b, third(REPLY[b % 8], 'D'), 0.45); c.line('iron', b, REPLY[b % 8], 0.5)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.2, s='clang')
    c.note('fx', 0, 0, 1, 60, 0.17, s='boom')
    for b in (1, 5, 9, 13): c.note('fx', b, 14, 2, 60, 0.3, s='steam')
    tomfill(c, 15, 8); c.note('fx', 15, 0, 16, 60, 0.3, s='short')

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
