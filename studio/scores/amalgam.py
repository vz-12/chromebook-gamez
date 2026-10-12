"""amalgam: THE AMALGAM, EMBER's rite and the end of the long road (MUSIC-PLAN.md). "I am made of
favourites": he took the bosses he already had and bolted them into the shape of a person, so the song is
bolted together the same way, in the order he does it on screen. Each part brings one motif from its
boss's theme, moved into D minor and played by this track's own band (one lead, strings under it,
guitars, a choir), so it is one song and not five. Between the parts it walks. 140 BPM, D minor.

It does not follow the fight: the fight is held to a hundred seconds at least, and this is about that
long, played through and round again.

  intro      4 bars, once  the walk: a step on one and on three, the floor shaking
  arms       8 bars        THE WARDEN's riff, one guitar a side (two wardens), then both under the
                           main theme's first phrase
  walk1      2 bars        it walks
  torso      8 bars        FORGEHEART: the foundry's tune hammered out by low brass, the whole band on
                           its 3 + 3 + 2; then its reply in long notes
  walk2      2 bars        it walks, with a top line now
  legs       8 bars        BROODMOTHER: the brood's long sliding line over a bounce and a choir
  shoulders  8 bars        THE ARCHIVIST: its subject at two notes a bar, a chorale down the circle of
                           fifths, a harpsichord plucking it; the guitars come back half-way
  heart      4 bars        its own: the room it was built around. A piano, the choir, no drums
  head       4 bars        NULL's statement: the bass climbing a step a bar, a roll, and
  all        16 bars       everything he ever made: the main theme and its answer at speed, in octaves
  coda       4 bars        the walk at its heaviest; back to the arms

What is taken from the other themes is a motif each, never a passage: every bar here is arranged for
this track. The walk and the heart are its own.
"""
import numpy as np
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip, gate, shift
from inst import hit, synth, guitar, amp, sampler, skitter, clips, riser, reverse, boom
from scores._common import THEME, ANSWER, third, kit, forge, vault, void, tomfill, riff, gallop, move, sing, legato
from scores.warden import RIFF
from scores.foundry import TUNE, REPLY
from scores.hive import BROOD
from scores.archivist import LONG
from scores.null import STATE

TITLE = 'Made of Favourites'
ORDER = ['intro', 'arms', 'walk1', 'torso', 'walk2', 'legs', 'shoulders', 'heart', 'head', 'all', 'coda', 'arms']

def _moved(text, semis):
    """A guitar riff (root:length, * for a chord left to ring) moved by semitones."""
    out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        if name == 'r': out.append(tok); continue
        out.append(f"{int(midi(name.rstrip('*')) + semis)}{'*' if name.endswith('*') else ''}:{d}")
    return ' '.join(out)

# its own: the walk, two bars. A step on one and on three, each a chord left to ring
WALK = ['D2*:6 D2:2 F2*:6 F2:2', 'Bb1*:6 Bb1:2 A1*:4 A1:2 C2:2']
WALK_CH = [('Dm', 'F'), ('Bb', 'A')]
WALK_TOP = ['D5:16', 'F5:8 E5:8']
# its own: the tune of the room inside it, in the walk's rhythm and over the walk's four chords
FAV = ['A4:6 D5:2 F5:8', 'E5:6 C5:2 A4:8', 'D5:6 F5:2 Bb5:8', 'A5:8 E5:4 C#5:4']
FAV_CH = ['Dm', 'F', 'Bb', 'A']
# the borrowed motifs, each moved into D minor
ARM = [_moved(t, 5) for t in RIFF[:4]]                       # THE WARDEN's riff
TH = [move(t, 5) for t in THEME]                             # the main theme, which THE WARDEN sang first
TH_CH = ['Dm', 'Dm', 'C', 'F', 'Dm', 'Dm', 'Bb', 'C']
AN = [move(t, 5) for t in ANSWER[:7]] + ['A5:2 C#6:2 E6:2 G6:2 F6:2 E6:2 C#6:2 A5:2']    # its answer; the last run kept under A6
AN_CH = ['Bb', 'C', 'Dm', 'Dm', 'Bb', 'C', 'A', 'A']
FORGE_CH = ['Dm', 'Dm', 'F', 'C', 'F', 'C', 'Gm', 'Dm']      # FORGEHEART: the tune's four bars, then the reply's
BROOD_D = [move(t, -4) for t in BROOD]                       # BROODMOTHER's long line
BROOD_CH = ['Dm', 'Bb', 'Gm', 'A', 'Dm', 'Bb', 'Eb', 'A']
LONG_D = [move(t, 3) for t in LONG]                          # THE ARCHIVIST's subject at half speed
LONG_CH = ['Dm', 'Gm', 'C', 'F', 'Bb', 'Edim', 'A', 'Dm']
HEAD = [(sym, bass, move(text, -10)) for (_, _, text), (sym, bass) in zip(STATE, [('Dm', 'D2'), ('C', 'E2'), ('F', 'F2'), ('Gm', 'G2')])]   # NULL's statement
LOW = {'Dm': 'D2', 'C': 'C2', 'F': 'F2', 'Bb': 'Bb1', 'A': 'A1', 'Gm': 'G1', 'Eb': 'Eb2', 'Edim': 'E2'}
VOICE = {'Dm': 'D3 A3 D4 F4 A4', 'C': 'C3 G3 C4 E4 G4', 'F': 'F2 C3 F3 A3 C4', 'Bb': 'Bb2 F3 Bb3 D4 F4', 'A': 'A2 E3 A3 C#4 E4',
         'Gm': 'G2 D3 G3 Bb3 D4', 'Eb': 'Eb3 Bb3 Eb4 G4 Bb4', 'Edim': 'E3 Bb3 E4 G4 Bb4'}
ACC = (0, 3, 6, 8, 11, 14)                                    # the hammer: 3 + 3 + 2, twice a bar

def song():
    K = kit(); V = void(); F = forge(); T = vault()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}      # the F recording carries a major third: it does not move
    s = Song('amalgam', 140, target=-10.0, ceil=-2.0, room=dict(decay=2.6, pre=0.02, bright=6000.0, dark=1500.0),
             master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.95, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('dkick', Bus(hit(K['kick_m']), gain=0.6, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.78, rev=0.16, fx=[lambda x: clip(x, 0.55)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.55, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.4, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.3, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.5), gain=0.6, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.75), gain=0.42, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    # one guitar a side, for the two wardens: the same double-tracked part with the far side turned down
    s.add('gtrL', Bus(guitar(chugs, K['chords'], wide=1.0), gain=0.6, rev=0.06, fx=[amp, lambda x: clip(x, 0.9) * np.array([1.0, 0.1])]))
    s.add('gtrR', Bus(guitar(chugs, K['chords'], wide=1.0), gain=0.6, rev=0.06, fx=[amp, lambda x: clip(x, 0.9) * np.array([0.1, 1.0])]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75, glide=0.08),
                      gain=0.45, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('stack', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, sq=0.15, cutoff=1800.0, env=1.3, fdecay=0.5, res=0.8, track=0.3,
                             a=0.03, d=0.5, s=0.85, r=0.3, dirt=0.25, glide=0.1),
                       gain=0.13, rev=0.3, duck=0.3, fx=[lambda x: hp(x, 160.0)]))
    s.add('horn', Bus(sampler(V['horn'], rel=0.2), gain=0.55, rev=0.3, duck=0.15, fx=[lambda x: clip(hp(x, 90.0), 0.7)]))
    s.add('stab', Bus(sampler(V['stab'], rel=0.06), gain=0.9, rev=0.25, fx=[lambda x: hp(x, 120.0)]))
    s.add('brass', Bus(synth('saw', voices=3, detune=0.08, spread=0.4, cutoff=1300.0, env=1.8, fdecay=0.3, res=0.8, track=0.4,
                             a=0.02, d=0.3, s=0.85, r=0.14, vib=0.06, dirt=0.3, glide=0.07),
                       gain=0.26, rev=0.32, duck=0.1, fx=[lambda x: peak(hp(x, 150.0), 900.0, 2.0, 1.0)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.5), gain=0.28, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('lead', Bus(synth('saw', voices=4, detune=0.12, spread=0.6, sq=0.25, cutoff=3200.0, env=0.9, fdecay=0.25, res=1.0,
                            a=0.012, d=0.2, s=0.9, r=0.15, vib=0.16, vibat=0.28, glide=0.055, dirt=0.3),
                      gain=0.24, dly=0.22, rev=0.28, duck=0.08, fx=[lambda x: peak(hp(x, 250.0), 2000.0, 1.5, 1.0)]))
    s.add('strings', Bus(sampler(V['strings'], rel=0.2), gain=0.55, rev=0.35, fx=[lambda x: hp(x, 250.0)]))
    s.add('anvil', Bus(hit(F['anvil'], human=0.002), gain=1.3, rev=0.3, fx=[lambda x: clip(hp(x, 250.0), 0.8)]))      # it rings on D as it is
    s.add('harpsi', Bus(sampler(T['harpsi'], rel=0.1), gain=0.5, rev=0.2, dly=0.08, fx=[lambda x: hp(x, 180.0)]))
    s.add('quill', Bus(synth('square', pw=0.12, cutoff=5200.0, env=0.6, fdecay=0.05, res=0.8, track=0.5, a=0.001, d=0.3, s=0.0, r=0.08),
                       gain=0.3, rev=0.2, dly=0.08, fx=[lambda x: hp(x, 400.0)]))
    s.add('legs', Bus(skitter(tone=3800.0), gain=1.2, rev=0.2, dly=0.1, fx=[lambda x: clip(x, 0.5)]))
    s.add('piano', Bus(sampler(V['piano'], rel=0.6), gain=0.7, rev=0.4, dly=0.2, fx=[lambda x: hp(x, 120.0)]))
    # the low D's loudest partial is its fifth, an F sharp: taken out, since this is D minor
    s.add('plow', Bus(sampler(V['plow'], rel=1.0), gain=0.55, rev=0.3,
                      fx=[lambda x: peak(peak(hp(x, 40.0), 183.5, -14.0, 9.0), 367.0, -14.0, 9.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.6), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'short': riser(s.bar, lo=600.0),
                           'rev': reverse(K['crash'], 1.6), 'rroll': reverse(shift(V['roll'], 2.0), 2.2), 'roll': shift(V['roll'], 2.0),
                           'clang': F['clang'][0], 'shatter': V['shatter']}),
                    gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(LOW[sym])
    def groot(sym): return LOW['Gm' if sym == 'Edim' else sym]      # under the diminished chord the guitars play G: a G minor sixth, which falls to A
    def near(sym, centre):
        p = root(sym) % 12 + 36
        while p - centre > 5: p -= 12
        while centre - p > 6: p += 12
        return p
    def tp(sym): return root(sym) % 12 + 36
    def bed(sec, bar, sym, v=1.0, at=0, dur=15.5):
        """The choir on the chord, its voices folded to where the recordings reach."""
        for m in chord(sym, 3):
            while m < 55: m += 12
            while m > 68: m -= 12
            sec.note('choir', bar, at, dur, m, v)
    def stack(sec, bar, sym, frm=None, v=1.0, at=0, dur=15.5):
        cur = [midi(n) for n in VOICE[sym].split()]; old = [midi(n) for n in VOICE[frm].split()] if frm else cur
        for p, q in zip(cur, old): sec.note('stack', bar, at, dur, p, v, **({'slide': q - p} if q != p else {}))
    def brassh(sec, bar, sym, at=0, v=1.0, dur=6):
        """Horns on the root with the fifth under it, and a trombone below."""
        sec.note('horn', bar, at, dur, near(sym, 45.0), v); sec.note('horn', bar, at, dur, near(sym, 45.0) - 5, v * 0.6)
        sec.note('stab', bar, at, 1.8, near(sym, 47.0), v * 0.8)
    def low(sec, bar, sym, frm=None, v=0.6, dur=15, at=0, p=None):
        r = midi(p) if p else root(sym); old = root(frm) if frm else r
        sec.note('bass', bar, at, dur, r, v, **({'slide': old - r} if old != r else {}))
    def bolt(sec, bar, v=1.0):
        """A part bolted on: iron, a cymbal, the floor."""
        sec.note('fx', bar, 0, 1, 60, 0.3 * v, s='clang'); sec.note('crash', bar, 0, 1, 60, v); sec.note('fx', bar, 0, 1, 60, 0.18 * v, s='boom')
    def roll(sec, bar, at=0, n=16, lo=0.3, hi=0.95, width=1.0):
        for k in range(n): sec.note('snare', bar, at + k * width, width, 60, lo + (hi - lo) * k / max(1, n - 1))
    def walk(sec, bar, weight=1):
        """Two bars of it walking. weight 0: guitars, bass and drums; 1: the choir on every step; 2: brass
        and the sliding chords as well, and a line held over the top."""
        for k in (0, 1):
            b = bar + k
            riff(sec, b, WALK[k], bass=False)
            at = 0.0
            for tok in WALK[k].split():                               # the bass holds every step for its whole length
                name, _, d = tok.partition(':'); d = float(d)
                sec.note('bass', b, at, d - 0.3, midi(name.rstrip('*')), 1.0 if name.endswith('*') else 0.85); at += d
            sec.hits('kick', b, 'x.....x.x.....x.' if k == 0 else 'x.....x.x...x.x.')
            sec.hits('snare', b, '........x.......')
            for n, (at, sym) in enumerate(((0, WALK_CH[k][0]), (8, WALK_CH[k][1]))):
                sec.note('timp', b, at, 6, tp(sym), 0.9)
                if weight >= 1: bed(sec, b, sym, 0.95, at, 7.5)
                if weight >= 2:
                    stack(sec, b, sym, WALK_CH[k][0] if n else WALK_CH[k - 1][1], 0.9, at, 7.5); brassh(sec, b, sym, at, 0.9)
            if weight >= 2:
                sec.line('lead', b, WALK_TOP[k], 0.9); sing(sec, 'strings', b, WALK_TOP[k], 0.85); sec.line('brass', b, WALK_TOP[k], 0.8, octave=-1)

    # ---- intro: it walks
    i = s.section('intro', 4, seg=4, loop=False, next='arms', lock=True)
    walk(i, 0, 0); walk(i, 2, 1)
    bolt(i, 0); i.note('crash', 2, 0, 1, 60, 0.8); i.note('fx', 0, 0, 1, 60, 0.26, s='roll')
    tomfill(i, 3, 12)

    # ---- arms: THE WARDEN. One guitar a side, then both, then the theme over them
    a = s.section('arms', 8, seg=4, next='walk1')
    for b in range(8):
        riff(a, b, ARM[b % 4], gtr='gtrL' if b == 0 else 'gtrR' if b == 1 else 'gtr')
        a.hits('kick', b, 'x.xx..xx..xx..x.' if b % 4 != 3 else 'x...x...x...xxxx', v=0.85)
        a.hits('snare', b, '........x.......' if b % 4 != 3 else '....x.......x...')
        a.hits('hat', b, 'x.o.x.o.x.o.x.o.', v=0.9)
        if b >= 4:
            a.line('lead', b, TH[b - 4], 1.0); sing(a, 'strings', b, TH[b - 4], 0.85); bed(a, b, TH_CH[b - 4], 0.8)
    bolt(a, 0); a.note('crash', 4, 0, 1, 60, 0.9); a.note('crash', 2, 0, 1, 60, 0.6)
    tomfill(a, 7, 12)

    # ---- walk1
    w1 = s.section('walk1', 2, seg=2, next='torso')
    walk(w1, 0, 1); w1.note('crash', 0, 0, 1, 60, 0.9); tomfill(w1, 1, 12)

    # ---- torso: FORGEHEART. The whole band on the hammer's six blows
    t = s.section('torso', 8, seg=4, next='walk2')
    for b in range(8):
        sym = FORGE_CH[b]; g = midi(groot(sym)); r = root(sym)
        for at in ACC:
            t.note('gtr', b, at, 2.6 if at in (0, 3, 8, 11) else 1.8, g, 1.0 if at in (0, 8) else 0.88, kind='chord')
            t.note('bass', b, at, 2.6 if at in (0, 3, 8, 11) else 1.8, r, 1.0 if at in (0, 8) else 0.85)
        t.hits('kick', b, 'x..x..x....x..x.'); t.hits('snare', b, '........x.......')
        t.note('anvil', b, 0, 2, 60, 1.0); t.note('anvil', b, 8, 2, 60, 0.8)
        if b < 4:
            t.line('brass', b, TUNE[b], 1.0, octave=-1); t.line('brass', b, TUNE[b], 0.6, octave=-2)
            if b % 2 == 0: brassh(t, b, sym, 0, 0.9)
        else:
            legato(t, 'lead', b, REPLY[b - 4], 1.0); sing(t, 'strings', b, REPLY[b - 4], 0.9); bed(t, b, sym, 0.9)
            t.note('timp', b, 0, 6, tp(sym), 0.8)
    bolt(t, 0); t.note('crash', 4, 0, 1, 60, 0.9)
    tomfill(t, 7, 12)

    # ---- walk2: with a line over the top now
    w2 = s.section('walk2', 2, seg=2, next='legs')
    walk(w2, 0, 2); w2.note('crash', 0, 0, 1, 60, 0.9); tomfill(w2, 1, 12)

    # ---- legs: BROODMOTHER. The brood's long line over a bounce
    l = s.section('legs', 8, seg=4, next='shoulders')
    for b in range(8):
        sym = BROOD_CH[b]; frm = BROOD_CH[b - 1] if b else 'A'; g = groot(sym)
        legato(l, 'lead', b, BROOD_D[b], 1.0); sing(l, 'strings', b, BROOD_D[b], 0.9)
        bed(l, b, sym, 1.0); stack(l, b, sym, frm, 0.75)
        riff(l, b, f'{g}*:3 {g}:1 {g}:2 r:2 {g}*:3 {g}:1 r:4')
        l.hits('kick', b, 'x..xx......x....'); l.hits('snare', b, '........x.......')
        l.hits('hat', b, 'x...x...x...x...', v=1.2)
        if b % 2 == 0: l.note('timp', b, 0, 6, tp(sym), 0.85)
    bolt(l, 0); l.note('crash', 4, 0, 1, 60, 0.9)
    l.note('legs', 3, 10, 5, 60, 0.8, n=14, curve=0.75); l.note('legs', 7, 8, 8, 60, 0.85, n=24, curve=0.7)
    tomfill(l, 7, 12)

    # ---- shoulders: THE ARCHIVIST. A chorale down the circle of fifths
    h = s.section('shoulders', 8, seg=4, next='heart')
    for b in range(8):
        sym = LONG_CH[b]; frm = LONG_CH[b - 1] if b else 'A'
        sing(h, 'strings', b, LONG_D[b], 1.0); legato(h, 'lead', b, LONG_D[b], 0.75)
        bed(h, b, sym, 1.0); low(h, b, sym, frm, 0.5)
        h.line('harpsi', b, LONG_D[b], 0.8, octave=-1); h.line('quill', b, LONG_D[b], 0.8)
        for at in (0, 8):                                           # the harpsichord's other hand: the chord, twice a bar
            for m in chord(sym, 4): h.note('harpsi', b, at, 3, m if m <= 71 else m - 12, 0.5)
        h.hits('kick', b, 'x.........x.....'); h.hits('snare', b, '........x.......', v=0.9)
        h.note('timp', b, 0, 8, tp(sym), 0.8)
        if b >= 4:
            h.note('gtr', b, 0, 16, midi(groot(sym)), 0.6, kind='chord'); stack(h, b, sym, frm, 0.8)
    bolt(h, 0, 0.8); h.note('crash', 4, 0, 1, 60, 0.8)

    # ---- heart: its own. The room it was built around
    c = s.section('heart', 4, seg=4, next='head', level=-2.0)
    for b in range(4):
        sym = FAV_CH[b]; frm = FAV_CH[b - 1] if b else 'Dm'
        c.line('piano', b, FAV[b], 1.0, octave=-1)
        bed(c, b, sym, 0.7); low(c, b, sym, frm, 0.3)
        c.hits('kick', b, 'x..o............', v=0.5)                 # a heartbeat
    c.note('plow', 0, 0, 30, 26, 0.9); c.note('plow', 0, 0, 30, 38, 0.6)
    c.note('fx', 3, 0, 16, 60, 0.16, s='short'); c.note('fx', 3, 15.99, 1, 60, 0.3, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- head: NULL's statement. The bass a step higher every bar
    n = s.section('head', 4, seg=4, next='all', level=-1.0)
    for b, (sym, bassn, text) in enumerate(HEAD):
        frm = HEAD[b - 1][0] if b else 'A'; half = b == 3
        stack(n, b, sym, frm, 1.0, 0, 7.5 if half else 15.5); bed(n, b, sym, 0.95, 0, 7.5 if half else 15.5)
        low(n, b, sym, None, 0.7, 7.5 if half else 15.5, 0, bassn)
        if b: n.ev['bass'][-1].kw['slide'] = midi(HEAD[b - 1][1]) - midi(bassn)
        brassh(n, b, sym, 0, 0.9 + 0.04 * b, 10); n.note('timp', b, 0, 8, midi(bassn) % 12 + 36, 0.85 + 0.05 * b)
        legato(n, 'lead', b, text, 1.0); sing(n, 'strings', b, text, 0.9); n.line('brass', b, text, 0.8, octave=-1)
        n.note('gtr', b, 0, 8 if half else 16, midi(groot(sym)), 0.9, kind='chord')
    # the fourth bar turns to the dominant half-way through
    stack(n, 3, 'A', 'Gm', 1.0, 8, 7.5); bed(n, 3, 'A', 1.0, 8, 7.5); low(n, 3, 'A', 'Gm', 0.7, 7.5, 8, 'A2')
    brassh(n, 3, 'A', 8, 1.0, 7); n.note('timp', 3, 8, 6, 45, 0.95); n.note('gtr', 3, 8, 8, midi('A1'), 0.95, kind='chord')
    n.note('crash', 0, 0, 1, 60, 0.8); n.note('crash', 2, 0, 1, 60, 0.7); n.note('fx', 0, 0, 1, 60, 0.18, s='boom')
    roll(n, 3, 0, 16, 0.3, 0.95); tomfill(n, 3, 12); n.note('fx', 2, 0, 32, 60, 0.22, s='riser')
    n.note('fx', 3, 15.99, 1, 60, 0.3, s='rev', lead=1.6 - 0.01 * s.step); n.note('fx', 3, 15.99, 1, 60, 0.3, s='rroll', lead=2.2 - 0.01 * s.step)

    # ---- all: everything he ever made. The theme and its answer at speed, in octaves
    q = s.section('all', 16, seg=4, next='coda')
    for b in range(16):
        sym, text = (TH_CH[b], TH[b]) if b < 8 else (AN_CH[b - 8], AN[b - 8])
        gallop(q, b, groot(sym))
        q.hits('kick', b, 'x.xx.xxxx.xx.xxx', v=0.85); q.hits('snare', b, '....x.......x...' if b != 15 else '....x...x.x.xxxx', v=1.15)
        q.hits('china', b, 'x...x...x...x...', v=0.65)
        q.line('lead', b, text, 1.0); sing(q, 'strings', b, text, 0.9); q.line('brass', b, text, 0.75, octave=-1)
        bed(q, b, sym, 1.0)
        if b % 2 == 0: brassh(q, b, sym, 0, 0.9); q.note('timp', b, 0, 6, tp(sym), 0.85)
        if b >= 12: q.line('lead', b, third(text, 'D'), 0.5, octave=-1)
    for b in (0, 8): bolt(q, b)
    q.note('crash', 4, 0, 1, 60, 0.8); q.note('crash', 12, 0, 1, 60, 0.8); q.note('fx', 0, 0, 1, 60, 0.26, s='shatter')
    tomfill(q, 7, 12); tomfill(q, 15, 8)

    # ---- coda: the walk at its heaviest
    z = s.section('coda', 4, seg=4, next='arms')
    walk(z, 0, 2); walk(z, 2, 2)
    bolt(z, 0); z.note('crash', 2, 0, 1, 60, 0.9); z.note('fx', 0, 0, 1, 60, 0.3, s='roll')
    roll(z, 3, 8, 16, 0.3, 0.95, width=0.5); tomfill(z, 3, 12)

    s.moods = {'p1': ['arms', 'walk1', 'torso', 'walk2', 'legs', 'shoulders', 'heart', 'head', 'all', 'coda']}
    s.start = 'intro'
    return s
