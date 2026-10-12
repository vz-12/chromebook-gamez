"""mirror: THE MIRROR, fracture ii (MUSIC-PLAN.md). "Everything in it faces you. I have filed it twice,
once from each side." So the music is written once and then looked at in a mirror, three ways, and all
three stay in the key:

  upside down    the tune reflected about C, every step up a step down. In A minor that turns an
                 A minor chord into itself and makes F and C change places, so the reflection has
                 chords of its own to stand on
  backwards      the tune from its last note to its first, long notes where the quick ones were
  the sound      a struck glass note played backwards: it swells out of nothing and stops where it
                 would have begun. The reflections are played on those

Broken glass for percussion: single shards where hi-hats would be, a bottle breaking on the backbeat,
a vase for a crash, and a pour of glass backwards (the pieces flying back together) into the bar lines.
128 BPM, A minor.

  intro  4 bars, once     the tune's first bar on glass, and its reflection answering
  a      16 bars, calm    the four faces in turn, four bars each: the tune, the tune upside down, the
                          tune backwards, and upside down and backwards, which leads back into the tune
  b      16 bars, fight   the tune and its reflection, twice, the second time in sixths
  c      16 bars, fight   b backwards. Not a variation: every note of b, the last bar first, each
                          note beginning where it ended; the drums the same distance from the far
                          bar line; the struck glass swapped for the backwards glass and the other way

So b then c is a palindrome thirty-two bars long, and the fight goes round it.
"""
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip, gate
from inst import hit, synth, keys, sampler, clips, riser, boom, layer, backwards
from scores._common import third, kit, void, mirror, tomfill, sing, retro, flip, backward

TITLE = 'Once From Each Side'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the tune: up the chord to a held note, a bar a line; and its three reflections
P = ['A4:2 C5:2 E5:4 A5:8', 'G5:2 F5:2 C5:4 F5:8', 'E5:2 G5:2 C5:4 E5:8', 'D5:4 B4:4 D5:4 G5:4']
P_CH = ['Am', 'F', 'C', 'G']
I = [flip(t) for t in P]                    # upside down about C: down the chord to a held note
I_CH = ['Am', 'C', 'F', 'G']                # its chords: F and C have changed places
R = [retro(t) for t in reversed(P)]         # backwards
R_CH = P_CH[::-1]
RI = [retro(t) for t in reversed(I)]        # upside down and backwards: it ends going up the chord the tune starts on
RI_CH = I_CH[::-1]
BASS = {'Am': 'A1', 'F': 'F1', 'C': 'C2', 'G': 'G1'}

def song():
    K = kit(); V = void(); M = mirror()
    beat = 60.0 / 128
    s = Song('mirror', 128, target=-12.0, ceil=-1.5, room=dict(decay=2.8, pre=0.025, bright=7000.0, dark=1700.0),
             echo=dict(time=beat * 0.75, fb=0.42, taps=6), master=lambda x: highshelf(hp(x, 30.0), 9000.0, -2.0))
    s.add('kick', Bus(hit(K['kick_e']), gain=0.45, key=True, fx=[lambda x: clip(x, 0.75)]))
    # the backbeat: a tight snare with a bottle breaking on it
    s.add('snare', Bus(hit(layer((gate(K['snare_m'], 0.18, 0.06), 1.0), (hp(M['smash'], 1200.0), 0.6))), gain=0.6, rev=0.16,
                       fx=[lambda x: clip(x, 0.7)]))
    s.add('shard', Bus(hit(M['shards'], human=0.002), gain=0.9, rev=0.12, dly=0.08, fx=[lambda x: hp(x, 2500.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.5, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('bass', Bus(synth('saw', voices=1, sq=0.3, sub=0.5, cutoff=400.0, env=2.0, fdecay=0.16, res=0.9, track=0.35, a=0.006, d=0.18,
                            s=0.85, r=0.08, dirt=0.5, octave=1), gain=0.22, duck=0.5, fx=[lambda x: peak(hp(x, 40.0), 650.0, 2.5, 1.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.16, spread=1.0, cutoff=1300.0, track=0.2, a=0.35, d=0.5, s=0.9, r=0.5),
                     gain=0.13, rev=0.5, duck=0.35, fx=[lambda x: hp(x, 220.0)]))
    bell = lambda: keys(ratio=3.5, index=1.4, decay=1.5, spread=0.5)
    s.add('glass', Bus(bell(), gain=0.3, dly=0.3, rev=0.45, fx=[lambda x: hp(x, 300.0)]))
    s.add('rglass', Bus(backwards(bell()), gain=0.42, dly=0.3, rev=0.45, fx=[lambda x: hp(x, 300.0)]))       # the same glass, in the mirror
    s.add('piano', Bus(sampler(V['piano'], rel=0.5), gain=0.6, rev=0.35, dly=0.15, fx=[lambda x: hp(x, 120.0)]))
    s.add('rpiano', Bus(backwards(sampler(V['piano'], rel=0.3)), gain=0.75, rev=0.35, dly=0.15, fx=[lambda x: hp(x, 120.0)]))
    s.add('lead', Bus(synth('saw', voices=3, detune=0.1, spread=0.5, sq=0.3, cutoff=2900.0, env=1.0, fdecay=0.2, res=1.0, a=0.008,
                            d=0.18, s=0.85, r=0.12, vib=0.12, dirt=0.2), gain=0.2, dly=0.24, rev=0.28, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('strings', Bus(sampler(V['strings'], rel=0.25), gain=0.42, rev=0.4, fx=[lambda x: hp(x, 250.0)]))
    s.add('fx', Bus(clips({'boom': boom(), 'short': riser(s.bar, lo=600.0), 'break': M['break'], 'smash': M['smash'], 'unsmash': M['unsmash'],
                           'debris': M['debris'], 'pour': M['pour'], 'unpour': M['unpour']}), gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def into(sec, bar, what='unpour', v=0.3):
        """Glass flying back together, ending on the bar line after `bar`."""
        n = {'unpour': 1.7, 'unsmash': 0.55}[what]
        sec.note('fx', bar, 15.99, 1, 60, v, s=what, lead=n - 0.01 * s.step)

    # ---- intro: the tune's first bar, and its reflection
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    for b in range(4): i.chordn('pad', b, 0, 15.5, 'G' if b == 3 else 'Am', 4, 0.5 + 0.1 * b)
    i.line('glass', 0, P[0], 0.85); i.line('rglass', 1, I[0], 0.85, octave=1)
    i.line('glass', 2, P[0], 0.9); i.line('rglass', 2, I[0], 0.7, octave=1); i.line('piano', 2, P[0], 0.7, octave=-1)
    i.line('glass', 3, P[3], 0.9); i.line('piano', 3, P[3], 0.7, octave=-1)
    i.note('bass', 2, 0, 14, midi('A1'), 0.45); i.note('bass', 3, 0, 14, midi('G1'), 0.5)
    i.hits('shard', 1, '......x.......x.', v=0.7); i.hits('shard', 2, '..x...x...x...x.', v=0.75); i.hits('shard', 3, '..x...x...x.x.x.', v=0.8)
    i.hits('kick', 2, 'x...............', v=0.6); i.hits('kick', 3, 'x.......x.......', v=0.7)
    into(i, 3, 'unsmash', 0.3)

    # ---- a: calm. The four faces, four bars each
    a = s.section('a', 16, level=-3.5)
    for f, (lines, chs, refl) in enumerate([(P, P_CH, False), (I, I_CH, True), (R, R_CH, False), (RI, RI_CH, True)]):
        for n in range(4):
            b = f * 4 + n; sym = chs[n]; second = f >= 2
            a.chordn('pad', b, 0, 15.5, sym, 4, 0.8)
            a.note('bass', b, 0, 7, midi(BASS[sym]), 0.55); a.note('bass', b, 8, 6, midi(BASS[sym]), 0.45)
            # the tune is struck; its reflection is the same sound backwards, and sits where a reflection would: above the glass, under the piano
            a.line('rglass' if refl else 'glass', b, lines[n], 0.9, octave=1 if refl else 0)
            a.line('rpiano' if refl else 'piano', b, lines[n], 0.85, octave=0 if refl else -1)
            a.hits('kick', b, 'x.......x.......' if not second else 'x.......x.x.....', v=0.7)
            a.hits('shard', b, '..x...x...x...x.' if not second else '..x.x.x...x.x.x.', v=0.75)
            if second: a.hits('snare', b, '........x.......', v=0.7)
    into(a, 7, 'unpour', 0.22); into(a, 15, 'unsmash', 0.26)
    a.note('fx', 8, 0, 1, 60, 0.12, s='boom')

    # ---- b: fight. The tune and its reflection, twice
    f = s.section('b', 16, next='c')
    for q, (lines, chs, refl, harm) in enumerate([(P, P_CH, False, False), (I, I_CH, True, False), (P, P_CH, False, True), (I, I_CH, True, True)]):
        for n in range(4):
            b = q * 4 + n; sym = chs[n]; r = midi(BASS[sym]); up = 1 if refl else 0
            f.chordn('pad', b, 0, 15.5, sym, 4, 0.9)
            for k in range(8): f.note('bass', b, k * 2, 1.7, r + (12 if k in (3, 7) else 0), 1.0 if k % 2 == 0 else 0.82)
            f.hits('kick', b, 'x.....x.x.......'); f.hits('snare', b, '....x.......x...')
            f.hits('shard', b, 'x.o.x.o.x.o.x.oo', v=0.8)
            f.line('lead', b, lines[n], 1.0, octave=up)
            f.line('rglass' if refl else 'glass', b, lines[n], 0.8, octave=up)
            if harm: sing(f, 'strings', b, lines[n], 0.8); f.line('lead', b, third(lines[n], 'A'), 0.45, octave=up - 1)
    f.note('fx', 0, 0, 1, 60, 0.34, s='break'); f.note('fx', 0, 0, 1, 60, 0.18, s='boom'); f.note('fx', 8, 0, 1, 60, 0.3, s='debris')
    tomfill(f, 15)

    # ---- c: fight. b, backwards
    c = s.section('c', 16, next='b')
    backward(f, c, drums=('kick', 'snare', 'shard', 'tom'), swap={'glass': 'rglass', 'rglass': 'glass'}, skip=('fx',))
    # what broke at the top of b comes back together here: the same sounds, backwards, ending on the bar lines b began them on
    into(c, 7, 'unpour', 0.3); into(c, 15, 'unpour', 0.34)
    c.note('fx', 0, 0, 1, 60, 0.3, s='smash'); c.note('fx', 0, 0, 1, 60, 0.16, s='boom')

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
