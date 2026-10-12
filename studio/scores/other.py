"""other: THE OTHER, THE MIRROR's boss (MUSIC-PLAN.md). "It is you, and it has your build": so its song
is yours. It begins as the first song of the game, Entry Vector, seen in THE MIRROR's glass and gone
wrong, and the further it goes the less of it is yours. 160 BPM (the first song's 140, hurried), A minor.

  intro  4 bars, once  Entry Vector's own opening, bar for bar, but on glass, and every other bar of it
                       backwards: the notes in reverse order, each one a struck glass played backwards
  p1     16 bars       the first song's fight, more chaotic: the same rolling bass and stabs and the
                       theme on the lead, over a break instead of four on the floor, shards for hi-hats,
                       and from the fifth bar its reflection (the theme upside down) on the other side,
                       note against note. The last beat of every fourth bar sticks
  p2     16 bars       less yours: the reflection alone, both leads on it, over the chords a
                       reflection makes (F and C change places); guitars take the stabs' rhythm. Then the
                       reflection of the theme's answer, which ends a fifth below where the answer ended
  p3     16 bars       its own: a tune that is not the theme at all, and for the first time a real
                       dominant (E major, a G sharp). It is a palindrome, four bars out and the same
                       four bars back, so it ends on the note it began with

The corrupted OTHER has a counterpart of its own: corrupt.py.
"""
import numpy as np
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip, gate
from inst import hit, synth, keys, guitar, amp, sampler, clips, riser, boom, layer, backwards
from scores._common import THEME, ANSWER, third, kit, void, mirror, tomfill, riff, sing, retro, flip

TITLE = 'Your Reflection'
ORDER = ['intro', 'p1', 'p2', 'p3', 'p3']

MI = [flip(t) for t in THEME]                # the theme upside down
BOTH_CH = ['Am', 'Am', 'G', 'F', 'Am', 'Am', 'F', 'G']       # the first song's chords, with what the two leads make of bar four
MI_CH = ['Am', 'Am', 'G', 'F', 'Am', 'Am', 'C', 'G']         # the reflection's own
MA = [flip(t) for t in ANSWER]               # the answer upside down
MA_CH = ['C', 'G', 'Am', 'F', 'C', 'G', 'Dm', 'Dm']
# its own tune: four bars out. The same four bars backwards bring it home
OWN = ['E5:6 A5:2 G5:4 E5:4', 'F5:6 A5:2 F5:4 D5:4', 'D5:6 G5:2 B5:4 G5:4', 'E5:4 G#5:4 B5:8']
OWN_CH = ['Am', 'Dm', 'G', 'E']
BASS = {'Am': 'A2', 'G': 'G2', 'C': 'C3', 'F': 'F2', 'E': 'E2', 'Dm': 'D3'}      # as the first song has them
GTR = {'Am': 'A2', 'G': 'G2', 'F': 'F2', 'C': 'C3', 'Dm': 'D3', 'E': 'E2'}
STAB = (0, 3, 6, 10, 13)                     # the first song's stabs

def kit_for(s, crushed=None):
    """The band, which corrupt.py borrows: the first song's own instruments, with glass in the kit."""
    K = kit(); V = void(); M = mirror()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    wrap = (lambda f: (lambda x: crushed(f(x)))) if crushed else (lambda f: f)
    s.add('kick', Bus(hit(K['kick_e']), gain=0.42, key=True, fx=[lambda x: clip(x, 0.75)]))
    # the first song's snare rings on D sharp, the one note furthest from A minor; loud as it is here that shows, so it is moved up to E
    s.add('snare', Bus(hit(layer((K['snare_w'], 1.0), (hp(M['smash'], 1200.0), 0.5)), tune=1.0), gain=0.85, rev=0.1, fx=[lambda x: clip(x, 0.6)]))
    s.add('shard', Bus(hit(M['shards'], human=0.002), gain=0.7, rev=0.1, fx=[lambda x: clip(hp(x, 2500.0), 0.5)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.07, spread=0.0, sub=0.55, sq=0.4, cutoff=420.0, env=3.5, fdecay=0.11,
                            res=1.2, track=0.3, a=0.003, d=0.1, s=0.75, r=0.04, dirt=0.5),
                      gain=0.38, duck=0.5, fx=[lambda x: clip(hp(x, 38.0), 0.8)]))
    s.add('arp', Bus(synth('square', pw=0.32, cutoff=1300.0, env=2.6, fdecay=0.07, res=1.5, a=0.002, d=0.08, s=0.12, r=0.07),
                     gain=0.3, dly=0.34, rev=0.22, duck=0.3, fx=[lambda x: hp(x, 180.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, cutoff=1000.0, track=0.2, a=0.2, d=0.5, s=0.9, r=0.4),
                     gain=0.14, rev=0.45, duck=0.5, fx=[lambda x: hp(x, 180.0)]))
    s.add('stab', Bus(synth('saw', voices=7, detune=0.24, spread=1.0, cutoff=2100.0, env=1.6, fdecay=0.14, a=0.008, d=0.18, s=0.45, r=0.14),
                      gain=0.32, rev=0.3, duck=0.4, fx=[lambda x: hp(x, 200.0)]))
    lead = lambda: synth('saw', voices=3, detune=0.11, spread=0.3, sq=0.3, cutoff=2700.0, env=1.3, fdecay=0.22, a=0.006, d=0.2, s=0.8,
                         r=0.13, vib=0.13, dirt=0.22)
    # you on the left and it on the right, each leaning in to the middle
    s.add('you', Bus(lead(), gain=0.28, dly=0.26, rev=0.25, duck=0.12, fx=[wrap(lambda x: hp(x, 220.0) * np.array([1.0, 0.45]))]))
    s.add('it', Bus(lead(), gain=0.28, dly=0.26, rev=0.25, duck=0.12, fx=[wrap(lambda x: hp(x, 220.0) * np.array([0.45, 1.0]))]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.4, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('strings', Bus(sampler(V['strings'], rel=0.2), gain=0.6, rev=0.35, fx=[lambda x: hp(x, 250.0)]))
    bell = lambda: keys(ratio=3.5, index=1.8, decay=1.1, spread=0.4)                         # the first song's bells
    s.add('glass', Bus(bell(), gain=0.36, dly=0.33, rev=0.45, fx=[lambda x: hp(x, 250.0)]))
    s.add('rglass', Bus(backwards(bell()), gain=0.5, dly=0.33, rev=0.45, fx=[lambda x: hp(x, 250.0)]))
    return M

def stuck(sec, bar, p, at=12, n=8, v=0.9, buses=('you', 'it')):
    """A note caught: the same one n times in what is left of the bar, fading."""
    w = (16 - at) / n
    for k in range(n):
        for bus in buses: sec.note(bus, bar, at + k * w, w * 0.9, p, v * (1.0 - 0.06 * k))
def last_note(text):
    return midi([t.partition(':')[0] for t in text.split() if not t.startswith('r')][-1].rstrip('!'))
def until(text, step):
    """A line as far as a step: the notes that begin before it, the last one cut to end there."""
    out, at = [], 0.0
    for tok in text.split():
        name, _, d = tok.partition(':'); d = float(d or 1)
        if at >= step: break
        out.append(f'{name}:{min(d, step - at):g}'); at += d
    return ' '.join(out)

def song():
    beat = 60.0 / 160
    s = Song('other', 160, target=-10.0, ceil=-2.0, room=dict(decay=2.1, pre=0.015, bright=6800.0, dark=1600.0),
             echo=dict(time=beat * 0.75, fb=0.36, taps=5), master=lambda x: highshelf(hp(x, 32.0), 8800.0, -2.0))
    M = kit_for(s)
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'short': riser(s.bar, lo=600.0), 'break': M['break'], 'smash': M['smash'],
                           'unsmash': M['unsmash'], 'debris': M['debris'], 'pour': M['pour'], 'unpour': M['unpour']}),
                    gain=1.0, rev=0.22, fx=[lambda x: clip(x, 0.8)]))

    def into(sec, bar, what='unpour', v=0.3):
        n = {'unpour': 1.7, 'unsmash': 0.55}[what]
        sec.note('fx', bar, 15.99, 1, 60, v, s=what, lead=n - 0.01 * s.step)
    def roll(sec, bar, sym, last=16):
        """The first song's bass: sixteenths rolling over the octave."""
        r = midi(BASS[sym])
        for k in range(last): sec.note('bass', bar, k, 0.9, r + (12 if k % 4 == 2 else 0), 1.0 if k % 4 == 0 else 0.8)
    def pad(sec, bar, sym, v=1.0):
        sec.chordn('pad', bar, 0, 15.5, sym, 3, v); sec.note('pad', bar, 0, 15.5, chord(sym, 4)[0], v * 0.7)
    def stabs(sec, bar, sym, v=1.0, last=16):
        for at in STAB:
            if at < last: sec.chordn('stab', bar, at, 1.6, sym, 4, v * (1.0 if at == 0 else 0.8))
    def arp(sec, bar, sym, v=0.9):
        """The first song's arpeggio, folded: up the chord in the first half of the bar, and the same notes back down in the second."""
        tones = chord(sym, 3) + chord(sym, 4); up = [0, 1, 2, 3, 4, 3, 2, 1]
        for k, t in enumerate(up + up[::-1]): sec.note('arp', bar, k, 0.9, tones[t], v * (1.0 if k % 4 == 0 else 0.78), open=1.3)

    # ---- intro: Entry Vector's opening, in the glass. Am, Am, F, G; every other bar backwards
    i = s.section('intro', 4, seg=2, loop=False, next='p1', lock=True)
    for b, sym in enumerate(['Am', 'Am', 'F', 'G']):
        pad(i, b, sym, 0.75 + 0.08 * b); i.note('bass', b, 0, 15, midi(BASS[sym]), 0.6, open=0.5 + 0.2 * b)
        tones = chord(sym, 4) + chord(sym, 5); order = [0, 2, 1, 3, 2, 4, 3, 5]
        back = b % 2 == 1
        for k, at in enumerate(range(0, 16, 2)):
            i.note('rglass' if back else 'glass', b, at, 2, tones[order[7 - k] if back else order[k]], 0.55 + 0.06 * b)
    i.line('glass', 1, 'r:8 A5:2 C6:2 E6:4', 0.85); i.line('rglass', 2, 'r:8 E6:2 C6:2 A5:4', 0.85)      # the hook, and the hook in the mirror
    i.hits('shard', 2, 'x.o.x.o.x.o.x.o.', v=0.75); i.hits('shard', 3, 'x.o.x.o.x.o.xoxo', v=0.85)
    i.hits('kick', 2, 'x.......x.......', v=0.75); i.hits('kick', 3, 'x...x...x...x...', v=0.85)
    i.hits('snare', 3, '........o.o.oxxX', v=0.8)
    i.note('fx', 0, 0, 1, 60, 0.22, s='smash'); into(i, 3, 'unpour', 0.34)

    # ---- p1: the first song's fight, gone wrong
    a = s.section('p1', 16, seg=2)
    for b in range(16):
        k = b % 8; sym = BOTH_CH[k]; catch = b % 4 == 3; last = 12 if catch else 16
        roll(a, b, sym, last); stabs(a, b, sym, 0.9, last); pad(a, b, sym, 0.85)
        if b >= 8: arp(a, b, sym)
        a.hits('kick', b, 'x.....x...x.....' if not catch else 'x.....x...x.xxxx')
        a.hits('snare', b, '....x..-....x...' if not catch else '....x..-........')
        a.hits('shard', b, 'xoxoxoxoxoxoxoxo' if not catch else 'xoxoxoxoxoxo....', v=0.85)
        mine, its = THEME[k], MI[k]
        if catch:                                                   # the last beat sticks, on whatever note each had reached
            a.line('you', b, until(mine, 12), 1.0); stuck(a, b, last_note(until(mine, 12)), buses=('you',))
            if b >= 4: a.line('it', b, until(its, 12), 0.9, octave=1); stuck(a, b, last_note(until(its, 12)) + 12, buses=('it',))
            into(a, b, 'unsmash', 0.32)
        else:
            a.line('you', b, mine, 1.0)
            if b >= 4: a.line('it', b, its, 0.9, octave=1)          # its reflection, an octave over, on the other side
    a.note('fx', 0, 0, 1, 60, 0.34, s='break'); a.note('fx', 0, 0, 1, 60, 0.22, s='boom')
    a.note('fx', 8, 0, 1, 60, 0.3, s='debris'); a.note('fx', 8, 0, 1, 60, 0.16, s='boom')
    a.note('fx', 4, 0, 1, 60, 0.24, s='smash'); a.note('fx', 12, 0, 1, 60, 0.24, s='smash')

    # ---- p2: less yours. The reflection alone, then the answer's
    p = s.section('p2', 16, seg=2)
    for b in range(16):
        k = b % 8; lines, chs = (MI, MI_CH) if b < 8 else (MA, MA_CH); sym = chs[k]; r = midi(BASS[sym]); g = GTR[sym]
        p.line('you', b, lines[k], 1.0, octave=1); p.line('it', b, lines[k], 1.0, octave=1)                 # both leads on it now
        p.line('you', b, third(lines[k], 'A'), 0.45); p.line('it', b, third(lines[k], 'A'), 0.45)           # and a sixth under it
        pad(p, b, sym, 0.9)
        for at in STAB:                                             # the stabs' rhythm, on the bass and guitars now
            p.note('bass', b, at, 2.6, r + (12 if at == 10 else 0), 1.0)
            p.note('gtr', b, at, 2.6 if at != 13 else 3, midi(g), 1.0 if at == 0 else 0.88, kind='chord')
        p.hits('kick', b, 'x..x..x...x..x..'); p.hits('snare', b, '....x.......x...' if b != 15 else '....x...x.x.xxxx')
        p.hits('shard', b, 'x.o.x.o.x.o.x.oo', v=0.85)
        if b >= 8: arp(p, b, sym, 0.8)
    for b in (0, 8): p.note('fx', b, 0, 1, 60, 0.34, s='break' if b == 0 else 'debris'); p.note('fx', b, 0, 1, 60, 0.2, s='boom')
    into(p, 7, 'unsmash', 0.3); tomfill(p, 15, 8); into(p, 15, 'unpour', 0.32)

    # ---- p3: its own. Four bars out, the same four back, twice
    q = s.section('p3', 16, seg=4)
    for b in range(16):
        n = b % 8; back = n >= 4; k = n if not back else 7 - n; sym = OWN_CH[k]; second = b >= 8; g = GTR[sym]
        text = OWN[k] if not back else retro(OWN[k])
        q.line('you', b, text, 1.0); q.line('it', b, text, 1.0, octave=-1)                                   # in octaves, one each side
        sing(q, 'strings', b, text, 0.9)
        if second: q.line('you', b, third(text, 'A'), 0.45, octave=-1); q.line('it', b, third(text, 'A'), 0.45, octave=-1)
        pad(q, b, sym, 1.0); roll(q, b, sym)
        riff(q, b, ' '.join(f'{g}*:2 {g}:1 {g}:1' for _ in range(4)) if not back else ' '.join(f'{g}:1 {g}:1 {g}*:2' for _ in range(4)), bass=False)
        q.hits('kick', b, 'x.....x...x..x..' if not back else 'x..x..x...x.....')      # the same beat, the same distance from the far bar line
        q.hits('snare', b, '....x..-.-..x...' if b != 15 else '....x...x.x.xxxx'); q.hits('shard', b, 'xoxoxoxoxoxoxoxo', v=0.9)
    for b in (0, 8): q.note('fx', b, 0, 1, 60, 0.36, s='break'); q.note('fx', b, 0, 1, 60, 0.22, s='boom')
    for b in (4, 12): q.note('fx', b, 0, 1, 60, 0.3, s='pour'); into(q, b - 1, 'unpour', 0.34)      # the mirror plane: it flies together and breaks again
    tomfill(q, 15, 8); into(q, 7, 'unsmash', 0.3); into(q, 15, 'unpour', 0.34)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    s.start = 'intro'
    return s
