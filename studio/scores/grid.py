"""grid: THE GRID, sector 01 (MUSIC-PLAN.md). The opening statement: driving synthwave, clean and
fast, and the first time the main theme is heard. 140 BPM, A minor.

  intro  4 bars, once     bells and a pad, the drums arriving, a riser into the first bar
  a      16 bars, calm    half the kit, an arpeggio, bells: the hook alone, then the whole theme quietly
  b      16 bars, fight   four on the floor, the rolling bass, the theme on the lead, harmonized second time
  c      16 bars, fight   the answer to the theme over a broken, half-time beat; falls back into b

The room's heat picks calm or fight (the game moves on the next four-bar line).
Nearest reference: wasteland (grid-locked, a pumping low end, room to breathe).
"""
import math
from daw import Song, Bus, chord, midi, hp, highshelf, clip
from inst import hit, synth, keys, clips, riser, reverse, boom
from scores._common import THEME, THEME_CH, ANSWER, ANSWER_CH, third, kit

TITLE = 'Entry Vector'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']
BASS = {'Am': 'A2', 'G': 'G2', 'C': 'C3', 'F': 'F2', 'E': 'E2', 'Em': 'E2', 'Dm': 'D3'}

def song():
    K = kit()
    s = Song('grid', 140, target=-12.0, ceil=-1.5, room=dict(decay=2.3, pre=0.02, bright=6500.0, dark=1500.0),
             master=lambda x: highshelf(hp(x, 30.0), 8500.0, -2.5))
    s.add('kick', Bus(hit(K['kick_e']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(K['snare_w']), gain=0.5, rev=0.10, fx=[lambda x: clip(x, 0.7)]))
    s.add('hat', Bus(hit(K['hats'], human=0.003), gain=0.4, fx=[lambda x: hp(x, 500.0)]))
    s.add('ohat', Bus(hit(K['ohat']), gain=0.28, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.27, rev=0.25, fx=[lambda x: hp(x, 300.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.5, rev=0.2))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.07, spread=0.0, sub=0.55, sq=0.4, cutoff=420.0, env=3.5, fdecay=0.11,
                            res=1.2, track=0.3, a=0.003, d=0.1, s=0.75, r=0.04, dirt=0.4),
                      gain=0.33, duck=0.6, fx=[lambda x: hp(x, 38.0)]))
    s.add('arp', Bus(synth('square', pw=0.32, cutoff=1300.0, env=2.6, fdecay=0.07, res=1.5, a=0.002, d=0.08, s=0.12, r=0.07),
                     gain=0.36, dly=0.38, rev=0.22, duck=0.3, fx=[lambda x: hp(x, 180.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, cutoff=900.0, track=0.2, a=0.3, d=0.5, s=0.9, r=0.45),
                     gain=0.2, rev=0.5, duck=0.55, fx=[lambda x: hp(x, 150.0)]))
    s.add('lead', Bus(synth('saw', voices=3, detune=0.11, spread=0.45, sq=0.3, cutoff=2700.0, env=1.3, fdecay=0.22,
                            a=0.006, d=0.2, s=0.8, r=0.13, vib=0.13, dirt=0.18),
                      gain=0.27, dly=0.3, rev=0.25, duck=0.15, fx=[lambda x: hp(x, 220.0)]))
    s.add('stab', Bus(synth('saw', voices=7, detune=0.24, spread=1.0, cutoff=2100.0, env=1.6, fdecay=0.14, a=0.008, d=0.18, s=0.45, r=0.14),
                      gain=0.3, rev=0.3, duck=0.4, fx=[lambda x: hp(x, 200.0)]))
    s.add('bell', Bus(keys(ratio=3.5, index=1.8, decay=1.1, spread=0.4), gain=0.36, dly=0.35, rev=0.45, fx=[lambda x: hp(x, 250.0)]))
    s.add('fx', Bus(clips({'riser': riser(2 * s.bar, tone=110.0), 'short': riser(s.bar, lo=600.0),
                           'rev': reverse(K['crash'], 1.6), 'boom': boom()}), gain=1.0, rev=0.15))

    def bass(sec, bar, sym, busy):
        r = midi(BASS[sym])
        if busy:   # sixteenths rolling over the octave
            for i in range(16): sec.note('bass', bar, i, 0.9, r + (12 if i % 4 == 2 else 0), 1.0 if i % 4 == 0 else 0.8)
        else:      # eighths, the octave once a bar
            for i in range(8): sec.note('bass', bar, i * 2, 1.7, r + (12 if i == 6 else 0), 1.0 if i % 2 == 0 else 0.82)
    def arp(sec, bar, sym, v=1.0, bright=1.0):
        tones = chord(sym, 3) + chord(sym, 4)
        for i, k in enumerate([0, 1, 2, 3, 4, 3, 2, 1, 0, 1, 2, 3, 4, 5, 4, 2]):
            sec.note('arp', bar, i, 0.9, tones[k], v * (1.0 if i % 4 == 0 else 0.78),
                     open=bright * (1.0 + 0.45 * math.sin((bar * 16 + i) / 32.0 * math.pi)))
    def pad(sec, bar, sym, v=1.0):
        sec.chordn('pad', bar, 0, 15.5, sym, 3, v)
        sec.note('pad', bar, 0, 15.5, chord(sym, 4)[0], v * 0.7)
    def stabs(sec, bar, sym, v=1.0):
        for at in (0, 3, 6, 10, 13): sec.chordn('stab', bar, at, 1.6, sym, 4, v * (1.0 if at == 0 else 0.8))
    def fill(sec, bar):
        for i, (at, semi) in enumerate([(12, 5), (13, 5), (14, 0), (15, -5)]):
            sec.note('tom', bar, at, 1, 60, 0.75 + 0.08 * i, semi=semi)

    # ---- intro: Am Am F G, the kit arriving
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    for b, sym in enumerate(['Am', 'Am', 'F', 'G']):
        pad(i, b, sym, 0.75 + 0.08 * b)
        i.note('bass', b, 0, 15, midi(BASS[sym]), 0.7, open=0.5 + 0.2 * b)
        tones = chord(sym, 4) + chord(sym, 5)
        for k, at in enumerate(range(0, 16, 2)): i.note('bell', b, at, 2, tones[[0, 2, 1, 3, 2, 4, 3, 5][k]], 0.5 + 0.06 * b)
    i.line('bell', 1, 'r:8 A5:2 C6:2 E6:4', 0.85)
    i.hits('hat', 2, 'x.o.x.o.x.o.x.o.', v=0.7); i.hits('hat', 3, 'x.o.x.o.x.o.xoxo', v=0.85)
    i.hits('kick', 2, 'x.......x.......', v=0.75); i.hits('kick', 3, 'x...x...x...x...', v=0.85)
    i.hits('snare', 3, '........o.o.oxxX', v=0.8)
    i.note('fx', 2, 0, 32, 60, 0.3, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.45, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- a: calm
    a = s.section('a', 16, level=-3.5)
    for b in range(16):
        sym = THEME_CH[b % 8]
        pad(a, b, sym); bass(a, b, sym, False); arp(a, b, sym, 0.9 if b < 8 else 1.0, 0.8 if b < 8 else 1.1)
        a.hits('kick', b, 'x.......x.x.....' if b % 2 else 'x.......x.......')
        a.hits('snare', b, '....o.......o...', v=0.8)
        a.hits('hat', b, 'x.o.x.o.x.o.x.o.' if b < 12 else 'x-o-x-o-x-o-x-o-', v=0.85)
    a.note('crash', 0, 0, 1, 60, 0.7); a.note('fx', 0, 0, 1, 60, 0.16, s='boom')
    for b, text in [(0, 'A4:2 C5:2 E5:12'), (2, 'D5:2 B4:2 G4:12'), (4, 'A4:2 C5:2 E5:12'), (6, 'C5:2 A4:2 F4:12')]:
        a.line('bell', b, text, 0.8)
    for b in range(8):
        a.line('bell', 8 + b, THEME[b], 0.85)
        a.line('lead', 8 + b, THEME[b], 0.42)
    a.note('crash', 8, 0, 1, 60, 0.55)
    fill(a, 15); a.note('fx', 15, 15.99, 1, 60, 0.3, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- b: fight, the theme
    f = s.section('b', 16, next='c')
    for b in range(16):
        sym = THEME_CH[b % 8]
        bass(f, b, sym, True); stabs(f, b, sym, 0.9 if b < 8 else 1.0); pad(f, b, sym, 0.85)
        if b >= 8: arp(f, b, sym, 0.9, 1.5)
        f.hits('kick', b, 'x...x...x...x...')
        f.hits('snare', b, '....x.......x..o' if b % 4 == 3 else '....x.......x...')
        f.hits('hat', b, 'xoxoxoxoxoxoxoxo', v=0.9)
        f.hits('ohat', b, '..x...x...x...x.', v=0.85)
        f.line('lead', b, THEME[b % 8], 1.0)
        if b >= 8: f.line('lead', b, third(THEME[b % 8]), 0.5)
    for b in (0, 4, 8, 12): f.note('crash', b, 0, 1, 60, 1.0 if b in (0, 8) else 0.65)
    f.note('fx', 0, 0, 1, 60, 0.26, s='boom'); f.note('fx', 8, 0, 1, 60, 0.16, s='boom')
    f.note('fx', 15, 0, 16, 60, 0.28, s='short'); fill(f, 15); f.hits('snare', 15, '............xxxx', v=0.9)

    # ---- c: fight, the answer, on a broken beat
    c = s.section('c', 16, next='b')
    for b in range(16):
        sym = ANSWER_CH[b % 8]
        r = midi(BASS[sym])
        for at in (0, 3, 6, 10, 13): c.note('bass', b, at, 2.6, r + (12 if at == 10 else 0), 1.0)
        c.hits('kick', b, 'x..x..x...x..x..')
        c.hits('snare', b, '........x.......')
        c.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.85); c.hits('ohat', b, '..............x.', v=0.8)
        pad(c, b, sym, 1.0)
        if b >= 8: stabs(c, b, sym, 0.75); arp(c, b, sym, 0.8, 1.3)
        c.line('lead', b, ANSWER[b % 8], 1.0)
        if b >= 8: c.line('lead', b, third(ANSWER[b % 8]), 0.45)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9)
    c.note('fx', 0, 0, 1, 60, 0.24, s='boom')
    c.hits('snare', 15, '........X...xxxx', v=0.9); fill(c, 15); c.note('fx', 15, 0, 16, 60, 0.3, s='short')

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
