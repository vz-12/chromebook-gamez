"""root: ROOT, at the bottom of THE FRACTURE (MUSIC-PLAN.md). The title is the user's: "Child's Play".

He is a child with the admin password. He types cheats ("hp.set(max)", "arena.shrink(0.7)"), he says the
room is his and that it is not cheating if he wrote the rules, and when his typing is broken he says it
does not count. So his song is the tune every playground has, the one sung at whoever is losing: five
notes, down a third, up a fourth, down a step, down a third. Nothing else is in it. He sings it, then
louder, then higher, and when that is not enough he changes the rules.

Techno, and metal: a kick on every beat with the bass between the beats, an acid line, a wall of saws,
guitars on the taunt's own rhythm; a square wave for his voice, sliding up into every note; a music box,
because he is small; typewriter keys where the hi-hats would be, because he never stops typing, and its
bell when a line is entered. 170 BPM, C sharp minor: one more whole step down from the three rooms above.

  intro  4 bars, once  a music box plays the taunt, sweetly; typing; he joins in; the kick
  p1     16 bars       "this is MY room": the taunt on his voice over the whole machine, three times
                       where it is, then a step up, then higher; second time round the saws sing it too
  p2     16 bars       "I can just do that. watch.": half time. The taunt slowly, as it is said to
                       someone's face, the music box over it, an acid line under; at the end of each
                       half he mashes the keys and the power goes
  p3     16 bars       the tantrum: both feet, everything at once. Half-way he changes the rules: the
                       whole song goes up a semitone, because he says so, and comes back down as if
                       it had not
  race   16 bars       THE HACKER's rite, the typing race: two typists, one a side, runs traded half a
                       bar each, the bell at the end of every line

His health is the phase, and one of his cheats puts it back to full: the song goes back to p1 with it.
"""
import numpy as np
from daw import SR, Ev, Song, Bus, chord, midi, hp, lp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, synth_kick, layer, tapestop
from scores._common import third, kit, vault, riff, legato, move, acid, musicbox, tomfill

TITLE = "Child's Play"
ORDER = ['intro', 'p1', 'p2', 'race', 'p3']

# the taunt, five notes; and the song, which is the taunt eight times: where it is, a step up, higher, and a tantrum
TAUNT = 'E5:4 C#5:4 F#5:2 E5:2 C#5:4'
CHILD = [TAUNT,
         'E5:4 C#5:4 F#5:2 E5:2 C#5:2 G#4:2',
         TAUNT,
         'F#5:4 D#5:4 G#5:2 F#5:2 D#5:4',
         'B5:4 G#5:4 C#6:2 B5:2 G#5:4',
         'B5:4 G#5:4 C#6:2 B5:2 G#5:2 E5:2',
         'A5:4 F#5:4 B5:2 A5:2 F#5:4',
         'G#5:2 B#5:2 D#6:2 G#6:2 F#6:2 D#6:2 B#5:2 G#5:2']
CH = ['C#m', 'C#m', 'A', 'B', 'C#m', 'C#m', 'F#m', 'G#']
# said slowly, two bars to each chord
SLOW = [('C#m', 'E5:8 C#5:8', 'F#5:4 E5:4 C#5:8'), ('A', 'E5:8 C#5:8', 'F#5:4 E5:4 A5:8'),
        ('F#m', 'A5:8 F#5:8', 'B5:4 A5:4 F#5:8'), ('G#', 'G#5:8 B#5:8', 'D#6:4 B#5:4 G#5:8')]
UP = {'C#m': 'Dm', 'A': 'Bb', 'B': 'C', 'F#m': 'Gm'}                 # the rules, changed: everything a semitone higher
ROOT = {'C#m': 'C#2', 'A': 'A1', 'B': 'B1', 'F#m': 'F#2', 'G#': 'G#1', 'Dm': 'D2', 'Bb': 'Bb1', 'C': 'C2', 'Gm': 'G2'}
SCALE = [1, 3, 4, 6, 8, 9, 11]                                         # C sharp minor, as semitones over C
DEG = {'C#m': 0, 'A': 5, 'B': 6, 'F#m': 3, 'G#': 4}

def song():
    K = kit(); T = vault()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 170
    s = Song('root', 170, target=-10.0, ceil=-2.0, room=dict(decay=1.6, pre=0.015, bright=6500.0, dark=1500.0),
             echo=dict(time=beat * 0.75, fb=0.34, taps=4), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    # the machine: a kick tuned to the keynote, on every beat, and the bass in between
    thud = layer((synth_kick(f0=230.0, f1=69.3, sweep=0.055, length=0.3, click=1.0, body=1.2), 1.0), (hp(lp(K['kick_m'], 2500.0), 150.0), 0.35))
    s.add('kick', Bus(hit(thud), gain=0.42, key=True, fx=[lambda x: clip(x, 0.6)]))
    s.add('dkick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.5, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m'], tune=1.0), gain=0.65, rev=0.14, fx=[lambda x: clip(x, 0.65)]))      # it rings on G, which this key has no use for: moved up to G sharp, the fifth
    s.add('ohat', Bus(hit(K['ohat'], choke=0.03), gain=0.4, fx=[lambda x: hp(x, 600.0)]))
    s.add('type', Bus(hit(T['keys'], human=0.004), gain=0.8, rev=0.08, fx=[lambda x: clip(hp(x, 600.0), 0.4)]))     # he never stops typing
    s.add('ding', Bus(hit(T['bell']), gain=0.7, rev=0.3, dly=0.2, fx=[lambda x: clip(hp(x, 400.0), 0.45)]))                       # a line entered: the bell is on F sharp, the key's fourth
    s.add('crash', Bus(hit(K['crash']), gain=0.32, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.24, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('donk', Bus(synth('saw', voices=2, detune=0.1, spread=0.0, sub=0.6, sq=0.5, cutoff=700.0, env=3.0, fdecay=0.09, res=1.2,
                            track=0.3, a=0.002, d=0.12, s=0.4, r=0.04, dirt=0.9),
                      gain=0.4, duck=0.3, fx=[lambda x: clip(peak(hp(x, 40.0), 800.0, 2.5, 1.0), 0.75)]))
    s.add('acid', Bus(acid(), gain=0.3, dly=0.1, rev=0.08, duck=0.3, fx=[lambda x: clip(peak(hp(x, 45.0), 900.0, 2.0, 1.0), 0.8)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.34, rev=0.06, duck=0.2, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.34, duck=0.45, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    # his voice: a square wave that slides up into every note, and shakes
    s.add('brat', Bus(synth('square', pw=0.25, cutoff=9000.0, track=0.3, a=0.002, d=0.06, s=0.85, r=0.03, vib=0.22, vibhz=7.4, vibat=0.12, glide=0.04),
                      gain=0.3, dly=0.25, rev=0.14, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('saws', Bus(synth('saw', voices=7, detune=0.3, spread=1.0, cutoff=5200.0, env=0.6, fdecay=0.3, res=0.9, a=0.004, d=0.2, s=0.85,
                            r=0.12, glide=0.06, vib=0.08, vibat=0.3),
                      gain=0.3, dly=0.18, rev=0.25, duck=0.25, fx=[lambda x: hp(x, 250.0)]))
    s.add('box', Bus(musicbox(), gain=0.45, rev=0.35, dly=0.2, fx=[lambda x: hp(x, 400.0)]))
    # the other typist, for the race: on the left, and his on the right
    s.add('hack', Bus(synth('square', pw=0.5, cutoff=7000.0, track=0.3, a=0.002, d=0.05, s=0.8, r=0.03),
                      gain=0.3, dly=0.15, rev=0.12, fx=[lambda x: hp(x, 250.0) * np.array([1.0, 0.35])]))
    s.add('his', Bus(synth('square', pw=0.25, cutoff=9000.0, track=0.3, a=0.002, d=0.05, s=0.8, r=0.03, vib=0.15, vibhz=7.4),
                     gain=0.36, dly=0.15, rev=0.12, fx=[lambda x: hp(x, 250.0) * np.array([0.35, 1.0])]))
    low = synth('saw', voices=2, detune=0.08, sub=0.5, sq=0.4, cutoff=900.0, env=1.5, fdecay=0.2, a=0.003, d=0.2, s=0.9, r=0.1, dirt=0.6)
    def off(p):
        x = tapestop(low([Ev(0.0, 1.2, p, 1.0)], int(1.6 * SR), dict(t0=0.0)), 0.03, 0.6)
        return x / max(1e-9, float(np.abs(x).max()))
    s.add('fx', Bus(clips({'boom': boom(secs=2.2), 'riser': riser(2 * s.bar, lo=300.0, hi=9000.0), 'rev': reverse(K['crash'], 1.4),
                           'off': off(midi('G#2'))}), gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def whine(sec, bus, bar, text, v=1.0, octave=0, scoop=-2.0):
        """A line as he sings it: every note that is long enough to slide is slid up into, from under."""
        step = 0.0
        for tok in text.split():
            name, _, d = tok.partition(':'); d = float(d or 1)
            if name != 'r':
                kw = dict(slide=scoop) if d >= 2 else {}
                sec.note(bus, bar, step, d, midi(name) + 12 * octave, v, **kw)
            step += d
    def machine(sec, bar, sym, v=1.0, hats=True):
        """The kick on every beat, the bass on every beat between, a snare on two and four, and the typing."""
        sec.hits('kick', bar, 'x...x...x...x...', v=v)
        for at in (2, 6, 10, 14): sec.note('donk', bar, at, 1.7, root(sym), v)
        sec.hits('snare', bar, '....x.......x...', v=v)
        if hats: sec.hits('type', bar, 'x.xxx.xxx.xxx.xx', v=0.85); sec.hits('ohat', bar, '..x...x...x...x.', v=0.8)
    def jeer(g):
        """The guitars, on the taunt's own rhythm: long, long, short short, long."""
        return f'{g}*:2 {g}:1 {g}:1 {g}*:2 {g}:1 {g}:1 {g}*:1 {g}:1 {g}*:1 {g}:1 {g}*:2 {g}:1 {g}:1'
    def mash(sec, bar, at=12, v=0.9, p=73):
        """He mashes the keys: the same note, twice as fast as anything else, and the typing with it."""
        for n in range(int((16 - at) * 2)):
            sec.note('brat', bar, at + n * 0.5, 0.45, p + (12 if n % 4 == 3 else 0), v * (0.7 + 0.04 * n))
            sec.note('type', bar, at + n * 0.5, 0.5, 60, 0.9)
    def scale_run(deg, n=8, octave=5, sharp=False):
        """n notes up the key from one of its steps (sharp: with the raised seventh, over the chord that wants it)."""
        out = []
        for k in range(n):
            d = deg + k; pc = SCALE[d % 7] + (1 if sharp and d % 7 == 6 else 0)
            out.append(12 * (octave + 1) + pc + 12 * (d // 7))
        return out

    # ---- intro: a music box plays the taunt, sweetly; typing; he joins in; the kick
    i = s.section('intro', 4, loop=False, next='p1', lock=True)
    i.line('box', 0, TAUNT, 0.9, octave=1); i.line('box', 1, TAUNT, 0.9, octave=1); i.line('box', 2, TAUNT, 0.8, octave=1)
    i.hits('type', 1, 'x.xx..x.xxx..x.x', v=0.7); i.hits('type', 2, 'xxx.xx.xxxx.x.xx', v=0.8); i.hits('type', 3, 'xxxxxxxxxxxxxxxx', v=0.9)
    whine(i, 'brat', 2, TAUNT, 0.85)
    i.hits('kick', 2, 'x...x...x...x...', v=0.75); i.hits('kick', 3, 'x...x...x...x...', v=0.9)
    for at in (2, 6, 10, 14): i.note('donk', 3, at, 1.7, root('G#'), 0.8)
    whine(i, 'brat', 3, CHILD[7], 0.9); riff(i, 3, 'G#1*:8 G#1*:4 G#1:1 G#1:1 G#1:1 G#1:1', bass=False)
    i.hits('snare', 3, '........x.x.xxxx', v=0.65); i.note('ding', 3, 0, 4, 60, 0.9)
    i.note('fx', 2, 0, 32, 60, 0.16, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.22, s='rev', lead=1.4 - 0.01 * s.step)

    # ---- p1: "this is MY room"
    p = s.section('p1', 16, seg=4)
    for b in range(16):
        k = b % 8; sym = CH[k]; g = ROOT[sym]; second = b >= 8
        machine(p, b, sym); riff(p, b, jeer(g), bass=False)
        whine(p, 'brat', b, CHILD[k], 1.0)
        if second: p.line('saws', b, CHILD[k], 1.0, octave=-1)
        if k in (3, 7): p.note('ding', b, 14, 2, 60, 0.9)                       # enter
    for b in (0, 8): p.note('crash', b, 0, 1, 60, 1.0); p.note('fx', b, 0, 1, 60, 0.16, s='boom')
    for b in (4, 12): p.note('crash', b, 0, 1, 60, 0.6)
    tomfill(p, 7, 12); p.hits('snare', 15, '............xxxx', v=0.9); p.note('fx', 14, 0, 32, 60, 0.16, s='riser')

    # ---- p2: "I can just do that. watch." Half time; the taunt said slowly; and he mashes the keys
    q = s.section('p2', 16, seg=4)
    prev = None
    for u in range(8):
        sym, first, then = SLOW[u % 4]; g = ROOT[sym]; b = u * 2; second = u >= 4
        for h, text in enumerate((first, then)):
            bb = b + h; cheat = bb in (7, 15)
            riff(q, bb, f'{g}*:8 {g}:2 {g}:2 {g}*:4' if not cheat else f'{g}*:8 {g}*:4 r:4', bass=False)
            r = root(sym) + 12
            for n, o in enumerate([0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 7, 0, 7, 12][:12 if cheat else 16]):
                kw = dict(slide=-float(o)) if o == 12 else {}
                q.note('acid', bb, n, 0.9, r + o, 1.0 if n % 6 == 0 else 0.8, open=1.5 if n % 6 == 0 else 0.9, **kw)
            q.note('bass', bb, 0, 7, root(sym), 1.0); q.note('bass', bb, 10, 5, root(sym), 0.85)
            q.hits('kick', bb, 'x.........x.....'); q.hits('snare', bb, '........x.......')
            q.hits('china', bb, 'x...x...x...x...' if not cheat else 'x...x...x.......', v=0.6)
            if not cheat: q.hits('type', bb, 'x.xxx.xxx.xxx.xx', v=0.8)
            prev = legato(q, 'saws', bb, text, 1.25, most=12, prev=prev)
            q.line('box', bb, text, 0.8 if not second else 0.95, octave=1)
            if second: whine(q, 'brat', bb, text, 0.6, octave=1, scoop=-3.0)
            if cheat: mash(q, bb, 12, 0.85, p=80); q.note('fx', bb, 12, 4, 60, 0.15, s='off')
    for b in (0, 8): q.note('crash', b, 0, 1, 60, 1.0); q.note('fx', b, 0, 1, 60, 0.18, s='boom')
    q.note('ding', 7, 11, 2, 60, 0.9); q.note('ding', 15, 11, 2, 60, 0.9)

    # ---- p3: the tantrum. And half-way through, he changes the rules
    r_ = s.section('p3', 16, seg=4)
    for b in range(16):
        k = b % 8; changed = b >= 8 and b != 15
        sym = UP[CH[k]] if changed else CH[k]; g = ROOT[sym]
        tune = move(CHILD[k], 1) if changed else CHILD[k]
        machine(r_, b, sym, hats=False)
        r_.hits('dkick', b, 'xoxoxoxoxoxoxoxo', v=0.8, len=0.08); r_.hits('china', b, 'x.x.x.x.x.x.x.x.', v=0.6)
        r_.hits('type', b, 'xxxxxxxxxxxxxxxx', v=0.7)
        riff(r_, b, ' '.join(f'{g}*:1 {g}:1 {g}:1 {g}:1' for _ in range(4)), bass=False)
        whine(r_, 'brat', b, tune, 1.0); r_.line('saws', b, tune, 1.0)
        r_.line('saws', b, third(tune, 'D' if changed else 'C#'), 0.45)
    for b in (0, 8): r_.note('crash', b, 0, 1, 60, 1.0); r_.note('fx', b, 0, 1, 60, 0.2, s='boom')
    for b in (4, 12): r_.note('crash', b, 0, 1, 60, 0.7)
    r_.note('ding', 7, 14, 2, 60, 1.0); r_.hits('snare', 7, '............xxxx', v=0.9)      # enter: and the rules are different
    r_.note('fx', 6, 0, 32, 60, 0.18, s='riser'); tomfill(r_, 15, 12)

    # ---- race: THE HACKER's rite. Two typists, a run each, the bell at the end of every line
    c = s.section('race', 16, seg=4)
    for b in range(16):
        k = b % 8; sym = CH[k]; g = ROOT[sym]; second = b >= 8; first_his = b % 2 == 1          # every other line, his lands first
        sharp = sym == 'G#'
        c.hits('kick', b, 'x...x...x...x...', v=0.9)
        for at in (2, 6, 10, 14): c.note('donk', b, at, 1.7, root(sym), 0.9)
        c.hits('snare', b, '....x.......x...' if b != 15 else '....x.......xxxx', v=0.85)
        mine = scale_run(DEG[sym], 8, 5, sharp); yours = scale_run(DEG[sym] + 2, 8, 5, sharp)
        for n in range(8):
            a, z = (8, 0) if first_his else (0, 8)
            c.note('hack', b, a + n, 0.9, mine[n], 0.9); c.note('type', b, a + n, 1, 60, 0.8, pan=-0.7)
            c.note('his', b, z + n, 0.9, yours[n], 0.9); c.note('type', b, z + n, 1, 60, 0.8, pan=0.7)
        c.note('ding', b, 15, 1, 60, 0.7)
        if second:
            riff(c, b, jeer(g), bass=False)
            for m in chord(sym, 4): c.note('saws', b, 0, 15, m - (12 if m > 68 else 0), 0.5)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 1.0 if b == 8 else 0.8); c.note('fx', b, 0, 1, 60, 0.16, s='boom')

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3', 'race': 'race'}
    s.start = 'intro'
    return s
