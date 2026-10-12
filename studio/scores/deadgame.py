"""deadgame: DEAD GAME, THE HOUSE's boss (MUSIC-PLAN.md). An online game with nobody left in it: he is
only solid while the room is alive. His theme is that game's title music, still playing on a screen in an
empty lobby. It begins as it was written, for three square waves and a noise channel, and the voices leave
it one at a time; then the room fills and it is played by a band; and at the end, with the house fully
dark, it is played slow and low, with an echo of itself that is breaking up. 155 BPM, G minor.

  intro  4 bars, once  the screen comes on: a start-up arpeggio, an organ under the floor, the tune's
                       first two bars on one thin voice, PRESS START
  p1     16 bars       the title screen: the whole chip band; second time round THEY LEFT: the arpeggio
                       goes, then the bass, then the drums, and an organ and a choir take their places
  p2     16 bars       solid: guitars and drums under the square-wave lead, the theme and then its
                       second strain; the band drops out for half a bar where the first ends
  p3     16 bars       the blackout: half time, the theme low on the organ and the guitars with the lead
                       above it and a crushed echo of the lead behind it; then the second strain over
                       both feet and a choir

THE HOUSE's music box plays this same tune, in three: the lobby's music, heard from another room.
"""
import numpy as np
from daw import SR, Song, Bus, chord, midi, hp, lp, bp, highshelf, peak, clip, crush, st, fade, noise
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, organ, synth_kick, synth_hat
from scores._common import third, kit, hallows, riff, tomfill

TITLE = 'One Player Online'
ORDER = ['intro', 'p1', 'p2', 'p3', 'p3']

# the title theme, a bar a line, in 16ths. Its first four notes are the ones every ALL HALLOWS track opens on
THEME = ['G4:2 D5:2 Eb5:3 D5:1 Bb4:4 G4:4',
         'Bb4:2 Eb5:2 G5:3 F5:1 Eb5:4 D5:2 Eb5:2',
         'F5:2 D5:2 Bb4:2 D5:2 F5:4 Bb5:4',
         'A5:3 G5:1 F5:4 C5:4 A4:2 C5:2',
         'G4:2 D5:2 Eb5:3 D5:1 Bb4:2 D5:2 G5:4',
         'G5:2 Eb5:2 Bb4:2 Eb5:2 G5:3 Bb5:1 G5:4',
         'Eb5:2 G5:2 C6:4 Bb5:2 G5:2 Eb5:2 C5:2',
         'D5:3 F#5:1 A5:2 C6:2 A5:2 F#5:2 D5:4']
THEME_CH = ['Gm', 'Eb', 'Bb', 'F', 'Gm', 'Eb', 'Cm', 'D']
# its second strain: long notes climbing over E flat, F and home, twice
LOBBY = ['Bb5:6 G5:2 Eb5:4 G5:4',
         'C6:6 A5:2 F5:4 A5:4',
         'D6:8 Bb5:4 G5:4',
         'D5:2 G5:2 Bb5:2 D6:2 Bb5:4 G5:4',
         'Eb6:6 D6:2 Bb5:4 G5:4',
         'F6:6 Eb6:2 C6:4 A5:4',
         'F#5:4 A5:4 D6:6 C6:2',
         'Bb5:2 A5:2 F#5:2 D5:2 A5:8']
LOBBY_CH = ['Eb', 'F', 'Gm', 'Gm', 'Eb', 'F', 'D', 'D']
ROOT = {'Gm': 'G2', 'Eb': 'Eb2', 'Bb': 'Bb1', 'F': 'F2', 'Cm': 'C2', 'D': 'D2'}

def song():
    K = kit(); H = hallows()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 155
    s = Song('deadgame', 155, target=-10.0, ceil=-2.0, room=dict(decay=2.3, pre=0.02, bright=6000.0, dark=1500.0),
             echo=dict(time=beat * 0.75, fb=0.36, taps=4), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    # the chip band: two pulses, a triangle and noise
    n = int(0.11 * SR)
    csnare = fade(st(bp(noise(n, 31), 900.0, 7000.0) * np.exp(-np.arange(n) / (0.035 * SR))), 0.0005, 0.01)
    s.add('ckick', Bus(hit(synth_kick(f0=240.0, f1=55.0, sweep=0.03, length=0.16, click=0.15)), gain=0.3, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('csnare', Bus(hit(csnare), gain=0.34))
    s.add('chat', Bus(hit(synth_hat(0.035, 9000.0)), gain=0.22))
    s.add('pulse', Bus(synth('square', pw=0.25, cutoff=9000.0, track=0.3, a=0.002, d=0.06, s=0.85, r=0.03, vib=0.12, vibat=0.2),
                       gain=0.26, dly=0.3, rev=0.14, fx=[lambda x: hp(x, 200.0)]))
    s.add('arp', Bus(synth('square', pw=0.125, cutoff=8000.0, track=0.3, a=0.001, d=0.04, s=0.7, r=0.015),
                     gain=0.085, rev=0.12, fx=[lambda x: hp(x, 300.0)]))
    s.add('tri', Bus(synth('tri', cutoff=2600.0, track=0.4, a=0.001, d=0.05, s=1.0, r=0.02, dirt=0.3),
                     gain=0.14, duck=0.2, fx=[lambda x: hp(x, 40.0)]))
    # what is left of the lead when the connection goes
    s.add('ghost', Bus(synth('square', pw=0.25, cutoff=5000.0, track=0.3, a=0.002, d=0.06, s=0.85, r=0.03),
                       gain=0.12, dly=0.4, rev=0.3, fx=[lambda x: hp(crush(x, 5, 9), 300.0)]))
    # the house
    s.add('organ', Bus(organ(trem=0.3, tremhz=5.3), gain=0.3, rev=0.35, duck=0.15, fx=[lambda x: clip(hp(x, 110.0), 0.6)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.5), gain=0.26, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('bell', Bus(sampler(H['bell'], rel=1.5), gain=0.4, rev=0.4, fx=[lambda x: hp(x, 150.0)]))
    s.add('timp', Bus(sampler(H['timp'], rel=0.5), gain=0.45, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    # the band
    s.add('kick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.58, key=True, fx=[lambda x: clip(x, 0.7)]))      # its thud rings on E: moved onto E flat, which is in the key
    s.add('dkick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.6, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.6, rev=0.14, fx=[lambda x: clip(x, 0.65)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=1.0, fx=[lambda x: clip(hp(x, 500.0), 0.4)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.32, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.24, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.38, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.5)}),
                    gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def arp(sec, bar, sym, v=1.0, at=0.0, dur=16.0, rate=0.5):
        """A chord as one channel plays it: its notes one after another, too fast to count."""
        ns = chord(sym, 4); ns = ns + [ns[0] + 12]
        for k in range(int(dur / rate)): sec.note('arp', bar, at + k * rate, rate, ns[k % len(ns)], v)
    def walk(sec, bar, sym, v=1.0):
        """The triangle: the root and its octave, in eighths."""
        r = root(sym) + 12
        for k in range(8): sec.note('tri', bar, k * 2, 1.7, r + (12 if k % 2 else 0), v * (1.0 if k % 2 == 0 else 0.85))
    def held(sec, bus, bar, sym, v=1.0, lo=50, hi=65, at=0, dur=15.5):
        for m in chord(sym, 3):
            while m < lo: m += 12
            while m > hi: m -= 12
            sec.note(bus, bar, at, dur, m, v)
    def chips(sec, bar, v=1.0, fill=False):
        sec.hits('ckick', bar, 'x.....x.x.......', v=v); sec.hits('csnare', bar, '....x.......x...' if not fill else '....x.....x.xxxx', v=v)
        sec.hits('chat', bar, 'x.x.x.x.x.x.x.x.', v=v)

    # ---- intro: the screen comes on
    i = s.section('intro', 4, loop=False, next='p1', lock=True)
    for k, m in enumerate((55, 58, 62, 67, 70, 74, 79)): i.note('arp', 0, k * 0.5, 0.5, m, 1.0)          # power on
    i.note('bell', 0, 0, 30, 58, 0.7)
    for b in range(4):
        sym = 'D' if b == 3 else ('Eb' if b == 2 else 'Gm')
        held(i, 'organ', b, sym, 0.45 + 0.1 * b, lo=43, hi=58)
        if b >= 2: held(i, 'choir', b, sym, 0.6 + 0.15 * (b - 2), lo=55, hi=68)
    i.line('pulse', 1, THEME[0], 0.75); i.line('pulse', 2, THEME[1], 0.8)
    i.hits('arp', 3, 'x...x...x...x.xx', p=74, v=1.2)                                                    # PRESS START
    i.hits('csnare', 3, '........x.x.xxxx', v=0.8); i.note('timp', 3, 0, 8, 38, 0.6); i.note('timp', 3, 8, 8, 38, 0.75)
    i.note('fx', 2, 0, 32, 60, 0.12, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.18, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- p1: the title screen. And then THEY LEFT
    p = s.section('p1', 16, seg=4)
    for b in range(16):
        k = b % 8; sym = THEME_CH[k]; left = (b - 8) // 2 + 1 if b >= 8 else 0       # how many have gone: 0, then 1 to 4
        p.line('pulse', b, THEME[k], 1.0)
        if left < 1: arp(p, b, sym)
        else: held(p, 'organ', b, sym, 0.75, lo=43, hi=60)
        if left < 2: walk(p, b, sym)
        else: held(p, 'choir', b, sym, 0.8, lo=55, hi=68)
        if left < 3:
            chips(p, b, fill=(b == 7))
            p.hits('kick', b, 'x.....x.x.......', v=0.6)
        elif left == 3: p.hits('ckick', b, 'x...............', v=0.8)
    p.note('bell', 12, 0, 30, 58, 0.8)
    p.note('timp', 14, 0, 8, 43, 0.6); p.note('timp', 15, 0, 8, 38, 0.7); p.note('timp', 15, 8, 8, 38, 0.85)
    p.hits('csnare', 15, '........x.x.xxxx', v=0.8)
    p.note('fx', 14, 0, 32, 60, 0.2, s='riser'); p.note('fx', 15, 15.99, 1, 60, 0.26, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- p2: solid. A band under the square wave
    q = s.section('p2', 16, seg=4)
    for b in range(16):
        second = b >= 8; k = b % 8
        sym = (LOBBY_CH if second else THEME_CH)[k]; tune = (LOBBY if second else THEME)[k]; g = ROOT[sym]
        gone = b == 7                                   # the theme's last bar: the room empties for two beats
        if gone:
            riff(q, b, f'{g}*:4 r:8 {g}:1 {g}:1 {g}:1 {g}:1')
            q.hits('kick', b, 'x...........x.x.'); q.hits('snare', b, '............xxxx'); q.hits('crash', b, 'x...............', v=0.8)
        else:
            riff(q, b, ' '.join(f'{g}*:2 {g}:1 {g}:1' for _ in range(4)) if not second else f'{g}*:3 {g}*:3 {g}:1 {g}:1 {g}*:3 {g}*:3 {g}:1 {g}:1')
            q.hits('kick', b, 'x..x..x...x.x...' if b % 2 == 0 else 'x..x..x..x..x.x.')
            q.hits('snare', b, '....x.......x...' if b != 15 else '....x.......xxxx')
            q.hits('hat', b, 'x.x.x.x.x.x.x.x.' if not second else 'xoxoxoxoxoxoxoxo', v=0.85)
            held(q, 'organ', b, sym, 0.8)
            if second: held(q, 'choir', b, sym, 0.9, lo=55, hi=68)
            arp(q, b, sym, 1.2)
        q.line('pulse', b, tune, 1.0)
        if second: q.line('pulse', b, third(tune, 'G'), 0.4)
    for b in (0, 8): q.note('crash', b, 0, 1, 60, 1.0); q.note('fx', b, 0, 1, 60, 0.18, s='boom')
    q.note('crash', 4, 0, 1, 60, 0.6); q.note('crash', 12, 0, 1, 60, 0.7)
    q.note('fx', 7, 4, 16, 60, 0.2, s='riser'); tomfill(q, 15, 12); q.note('fx', 14, 0, 32, 60, 0.2, s='riser')

    # ---- p3: the blackout. Slow and low, and an echo that is breaking up
    r = s.section('p3', 16, seg=4)
    for b in range(16):
        second = b >= 8; k = b % 8
        sym = (LOBBY_CH if second else THEME_CH)[k]; tune = (LOBBY if second else THEME)[k]; g = ROOT[sym]
        riff(r, b, f'{g}*:6 {g}:1 {g}:1 {g}*:4 {g}:2 {g}:2' if not second else ' '.join(f'{g}*:1 {g}:1 {g}:1 {g}:1' for _ in range(4)))
        held(r, 'organ', b, sym, 1.0, lo=43, hi=62); held(r, 'choir', b, sym, 0.85 if not second else 1.0, lo=55, hi=68)
        if not second:
            r.hits('kick', b, 'x.........x.....' if b % 2 == 0 else 'x.....x...x.....'); r.hits('snare', b, '........x.......' if b != 7 else '........x...xxxx')
            r.hits('china', b, 'x...x...x...x...', v=0.65)
            r.line('organ', b, tune, 0.9, octave=-1)          # the theme, low, where the floor is
            r.line('ghost', b, 'r:3 ' + ' '.join(tune.split()[:-1]), 1.0)     # and its echo, three sixteenths late, short of its last note
        else:
            r.hits('dkick', b, 'xoxoxoxoxoxoxoxo', v=0.85, len=0.09); r.hits('kick', b, 'x.......x.......')
            r.hits('snare', b, '....x.......x...' if b != 15 else '....x.......xxxx'); r.hits('china', b, 'x.x.x.x.x.x.x.x.', v=0.6)
            r.line('pulse', b, third(tune, 'G'), 0.4)
        r.line('pulse', b, tune, 1.0)
    for b in (0, 8): r.note('crash', b, 0, 1, 60, 1.0); r.note('fx', b, 0, 1, 60, 0.2, s='boom')
    r.note('bell', 0, 0, 30, 58, 0.8); r.note('crash', 4, 0, 1, 60, 0.6); r.note('crash', 12, 0, 1, 60, 0.7)
    r.note('fx', 6, 0, 32, 60, 0.2, s='riser'); tomfill(r, 15, 12)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    s.start = 'intro'
    return s
