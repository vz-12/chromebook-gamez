"""void: THE VOID, sector 05 (MUSIC-PLAN.md). Vast, and pulling: the sector's hazard is gravity wells,
so everything here bends. The bass slides from each note into the next, the chords slide with it, and
the tune is a line that keeps falling while every phrase starts higher than the last. A piano in an
empty room, a choir a long way off, strings, and stars. 140 BPM, C minor.

  intro  4 bars, once     the dark: a drone climbing an octave out of nothing, the choir, the first stars
  a      16 bars, calm    the tune in slow motion on the piano, twice as long as it will be, over a
                          half-time pulse; strings and the sliding chords join for its second half
  b      16 bars, fight   the tune at speed on a lead that slides between its notes, strings under
                          it, a syncopated pulse in the middle; in sixths second time round
  c      16 bars, fight   the orbit: falling arpeggios in 3 + 3 + 2, the drums and bass in step with
                          them, the stars running in sixteenths; climbs to the dominant and falls back into b

Reference: Galactic Destruction (the rising bass, the slides between chords, long notes soaring over a
busy middle, stars in the quiet part), and void for how much room the calm section leaves.
"""
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip
from inst import hit, synth, keys, sampler, clips, riser, reverse, boom
from scores._common import third, kit, void, tomfill, slow, sing, legato

TITLE = 'Falling Upward'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the tune: a bar a line. A step up into a long note that sinks; then the same from a step higher
RISE = ['C5:2 Eb5:10 D5:2 C5:2',
        'D5:2 F5:10 Eb5:2 D5:2',
        'Eb5:2 G5:14',
        'G5:4 F5:2 Eb5:2 D5:4 Eb5:2 C5:2',
        'Eb5:2 Ab5:10 G5:2 F5:2',
        'F5:2 Bb5:10 Ab5:2 G5:2',
        'G5:2 C6:14',
        'D6:6 B5:2 G5:4 D5:4']
RISE_CH = ['Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'Cm', 'G']
# its answer: each chord falling in 3 + 3 + 2, each bar from higher up
ORBIT = ['C6:6 Ab5:6 F5:4',
         'Eb6:6 C6:6 Ab5:4',
         'Bb5:6 G5:6 Eb5:4',
         'D6:6 Bb5:6 F5:2 D5:2',
         'C6:6 Ab5:6 F5:4',
         'Eb6:6 C6:6 Ab5:4',
         'D6:6 B5:6 G5:4',
         'G5:2 B5:2 D6:2 G6:10']
ORBIT_CH = ['Fm', 'Ab', 'Eb', 'Bb', 'Fm', 'Ab', 'G', 'G']
BASS = {'Cm': 'C2', 'Ab': 'Ab1', 'Bb': 'Bb1', 'Fm': 'F1', 'Eb': 'Eb2', 'G': 'G1'}
# the chords as a brass section would stack them: root, fifth, root, third, fifth
VOICE = {'Cm': 'C3 G3 C4 Eb4 G4', 'Ab': 'Ab2 Eb3 Ab3 C4 Eb4', 'Bb': 'Bb2 F3 Bb3 D4 F4', 'Fm': 'F2 C3 F3 Ab3 C4',
         'Eb': 'Eb3 Bb3 Eb4 G4 Bb4', 'G': 'G2 D3 G3 B3 D4'}
OST = 'x.xx.xx.x.xx.xx.'

def song():
    K = kit(); V = void()
    beat = 60.0 / 140
    s = Song('void', 140, target=-12.0, ceil=-1.5, room=dict(decay=3.6, pre=0.035, bright=6500.0, dark=1500.0),
             echo=dict(time=beat * 0.75, fb=0.46, taps=7), master=lambda x: highshelf(hp(x, 30.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_e']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(K['snare_w']), gain=0.72, rev=0.3, fx=[lambda x: clip(x, 0.7)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.5, fx=[lambda x: hp(x, 600.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.35, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.5, rev=0.25, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.6), gain=0.7, rev=0.3, fx=[lambda x: clip(x, 0.8)]))
    s.add('drone', Bus(synth('saw', voices=3, detune=0.1, spread=0.4, sub=0.9, cutoff=260.0, track=0.2, a=1.2, d=0.5, s=1.0, r=1.5,
                             glide=1.3, dirt=0.4), gain=0.3, fx=[lambda x: peak(hp(x, 35.0), 500.0, 2.0, 1.0)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.1, spread=0.0, sub=0.5, sq=0.3, cutoff=440.0, env=2.0, fdecay=0.2, res=0.9,
                            track=0.3, a=0.006, d=0.2, s=0.85, r=0.12, dirt=0.6, glide=0.09),
                      gain=0.25, duck=0.5, fx=[lambda x: peak(hp(x, 38.0), 650.0, 2.5, 1.0)]))
    s.add('stack', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, sq=0.15, cutoff=1500.0, env=1.3, fdecay=0.5, res=0.8, track=0.3,
                             a=0.03, d=0.5, s=0.85, r=0.3, dirt=0.2, glide=0.1),
                       gain=0.13, rev=0.3, duck=0.3, fx=[lambda x: hp(x, 160.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.16, spread=1.0, cutoff=900.0, track=0.2, a=0.6, d=0.5, s=0.9, r=0.8),
                     gain=0.11, rev=0.55, duck=0.4, fx=[lambda x: hp(x, 250.0)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.6), gain=0.26, rev=0.6, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('lead', Bus(synth('saw', voices=4, detune=0.12, spread=0.6, sq=0.2, cutoff=3000.0, env=0.8, fdecay=0.3, res=0.9,
                            a=0.02, d=0.2, s=0.9, r=0.18, vib=0.16, vibat=0.3, glide=0.06, dirt=0.2),
                      gain=0.21, dly=0.25, rev=0.32, duck=0.1, fx=[lambda x: peak(hp(x, 250.0), 2000.0, 1.5, 1.0)]))
    s.add('strings', Bus(sampler(V['strings'], rel=0.25), gain=0.5, rev=0.4, fx=[lambda x: hp(x, 250.0)]))
    s.add('piano', Bus(sampler(V['piano'], rel=0.6), gain=0.6, rev=0.4, dly=0.2, fx=[lambda x: hp(x, 120.0)]))
    # the low C's loudest partial is its fifth, an E natural: taken out, since this is C minor
    s.add('plow', Bus(sampler(V['plow'], rel=1.0), gain=0.5, rev=0.3,
                      fx=[lambda x: peak(peak(hp(x, 40.0), 163.5, -14.0, 9.0), 327.0, -14.0, 9.0)]))
    s.add('star', Bus(keys(ratio=4.0, index=1.2, decay=1.2, spread=0.8), gain=0.25, dly=0.5, rev=0.55, fx=[lambda x: hp(x, 500.0)]))
    s.add('pulse', Bus(synth('square', pw=0.25, voices=2, detune=0.07, spread=0.7, cutoff=2400.0, env=1.0, fdecay=0.07, a=0.002,
                             d=0.1, s=0.3, r=0.05), gain=0.36, dly=0.25, rev=0.2, duck=0.2, fx=[lambda x: hp(x, 350.0)]))
    s.add('fx', Bus(clips({'boom': boom(), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'short': riser(s.bar, lo=600.0),
                           'rev': reverse(K['crash'], 1.8), 'rroll': reverse(V['roll'], 2.2), 'roll': V['roll'], 'whoosh': V['whoosh'],
                           'tinkle': V['tinkle'], 'ice': V['ice'], 'shatter': V['shatter']}),
                    gain=1.0, rev=0.3, fx=[lambda x: clip(x, 0.8)]))

    def bed(sec, bar, sym, v=1.0, bars=1):
        """The choir on the chord, its voices folded to where the recordings reach, and a soft pad."""
        for m in chord(sym, 3):
            while m < 55: m += 12
            while m > 68: m -= 12
            sec.note('choir', bar, 0, 16 * bars - 0.5, m, v)
        sec.chordn('pad', bar, 0, 16 * bars - 0.5, sym, 4, v)
    def bass(sec, bar, sym, mode, frm=None):
        """The bass, sliding into the bar from the root before it."""
        r = midi(BASS[sym]); old = midi(BASS[frm]) if frm else r
        sl = {'slide': old - r} if old != r else {}
        if mode == 'long': sec.note('bass', bar, 0, 30, r, 0.55, **sl)
        elif mode == 'drive':
            for i in range(8): sec.note('bass', bar, i * 2, 1.7, r + (12 if i in (3, 7) else 0), 1.0 if i % 2 == 0 else 0.82, **(sl if i == 0 else {}))
        else:                                                    # 3 + 3 + 2, twice
            for at, d in ((0, 3), (3, 3), (6, 2), (8, 3), (11, 3), (14, 2)):
                sec.note('bass', bar, at, d - 0.3, r + (12 if at in (6, 14) else 0), 1.0 if at in (0, 8) else 0.85, **(sl if at == 0 else {}))
    def stack(sec, bar, sym, frm=None, v=1.0, dur=15.5):
        """The chord, every voice sliding in from where it was in the chord before."""
        cur = [midi(n) for n in VOICE[sym].split()]; old = [midi(n) for n in VOICE[frm].split()] if frm else cur
        for p, q in zip(cur, old): sec.note('stack', bar, 0, dur, p, v, **({'slide': q - p} if q != p else {}))
    def stars(sec, bar, sym, at=(2, 7, 11, 14), v=0.7):
        tones = [m + 24 for m in chord(sym, 4)] + [m + 36 for m in chord(sym, 4)][:2]
        for i, st_ in enumerate(at): sec.note('star', bar, st_, 2, tones[(i * 2 + bar) % len(tones)], v * (0.7 + 0.3 * ((i + bar) % 2)))
    def ost(sec, bar, sym, v=0.8, pattern=OST):
        """The pulse in the middle: the chord's notes, off the beat as often as on it."""
        tones = chord(sym, 4); order = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2]; k = 0
        for i, ch in enumerate(pattern):
            if ch == 'x': sec.note('pulse', bar, i, 0.9, tones[order[k % len(order)]], v * (1.0 if i % 4 == 0 else 0.8)); k += 1
    def tp(sym): return midi(BASS[sym]) % 12 + 36

    # ---- intro: the dark. A drone climbing an octave out of nothing
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    i.note('drone', 0, 0, 62, midi('C2'), 0.9, slide=-12.0)
    i.note('plow', 0, 0, 40, 24, 0.6)
    for b in range(4):
        i.note('choir', b, 0, 15.5, midi('C4'), 0.45 + 0.12 * b); i.note('choir', b, 0, 15.5, midi('G4'), 0.4 + 0.12 * b)
        if b >= 2: i.note('choir', b, 0, 15.5, midi('Eb4'), 0.5 + 0.1 * b)
    stars(i, 1, 'Cm', (6, 12), 0.5); stars(i, 2, 'Cm', (2, 7, 11), 0.6); stars(i, 3, 'Cm', (0, 3, 6, 9, 12, 14), 0.7)
    i.line('piano', 2, 'C4:8 G4:8', 0.7); i.line('piano', 3, 'Eb4:16', 0.75)
    i.note('fx', 0, 0, 1, 60, 0.2, s='boom'); i.note('fx', 0, 0, 1, 60, 0.3, s='whoosh')
    i.hits('kick', 2, 'x...............', v=0.55); i.hits('kick', 3, 'x.......x.......', v=0.65)
    i.note('fx', 2, 0, 32, 60, 0.14, s='riser')
    i.note('fx', 3, 15.99, 1, 60, 0.3, s='rev', lead=1.8 - 0.01 * s.step); i.note('fx', 3, 15.99, 1, 60, 0.3, s='rroll', lead=2.2 - 0.01 * s.step)

    # ---- a: calm. The tune in slow motion: every bar of it takes two
    a = s.section('a', 16, level=-3.5)
    for k in range(8):
        sym = RISE_CH[k]; frm = RISE_CH[k - 1]; b = k * 2
        bed(a, b, sym, 0.85, bars=2); bass(a, b, sym, 'long', frm)
        if sym == 'Cm': a.note('plow', b, 0, 30, 24, 0.7); a.note('plow', b, 0, 30, 36, 0.5)
        a.line('piano', b, slow(RISE[k]), 0.9, octave=-1)
        if k >= 4:
            stack(a, b, sym, frm, 0.5, dur=31); sing(a, 'strings', b, slow(RISE[k]), 0.5)
        for h in (0, 1):
            a.hits('kick', b + h, 'x...............' if h == 0 else 'x.........o.....')
            if k >= 4 or h == 1: a.hits('snare', b + h, '........x.......', v=0.8)
            a.hits('hat', b + h, '..o...o...o...o.' if k < 4 else 'x.o.x.o.x.o.x.o.', v=1.0)
            stars(a, b + h, sym, (2, 7, 11, 14) if k < 4 else (0, 2, 5, 7, 10, 12, 14), 0.6)
            if k >= 4: ost(a, b + h, sym, 0.5, 'x.....x...x.....')
    a.note('fx', 0, 0, 1, 60, 0.26, s='tinkle'); a.note('fx', 8, 0, 1, 60, 0.24, s='ice'); a.note('fx', 0, 0, 1, 60, 0.12, s='boom')
    a.note('fx', 8, 0, 1, 60, 0.2, s='whoosh')
    a.note('fx', 15, 15.99, 1, 60, 0.24, s='rev', lead=1.8 - 0.01 * s.step)

    # ---- b: fight. The tune at speed
    f = s.section('b', 16, next='c')
    for b in range(16):
        sym = RISE_CH[b % 8]; frm = RISE_CH[(b - 1) % 8]
        bed(f, b, sym, 0.9); stack(f, b, sym, frm, 1.0); bass(f, b, sym, 'drive', frm); ost(f, b, sym, 0.85)
        f.hits('kick', b, 'x.....x.x.......' if b % 2 == 0 else 'x.....x.x.....x.')
        f.hits('snare', b, '....x.......x...' if b != 15 else '....x.......x.xx')
        f.hits('hat', b, 'xoxoxoxoxoxoxoxo', v=0.8)
        legato(f, 'lead', b, RISE[b % 8], 1.0); sing(f, 'strings', b, RISE[b % 8], 0.7 if b < 8 else 0.9)
        if b >= 8:
            f.line('lead', b, third(RISE[b % 8], 'C'), 0.5, octave=-1); f.line('star', b, RISE[b % 8], 0.6, octave=1)
        else: stars(f, b, sym, (2, 7, 11, 14), 0.6)
        if b % 4 == 0: f.note('timp', b, 0, 6, tp(sym), 0.9 if b % 8 == 0 else 0.7)
    for b in (0, 4, 8, 12): f.note('crash', b, 0, 1, 60, 1.0 if b in (0, 8) else 0.6)
    f.note('fx', 0, 0, 1, 60, 0.2, s='boom'); f.note('fx', 0, 0, 1, 60, 0.26, s='tinkle'); f.note('fx', 8, 0, 1, 60, 0.26, s='shatter')
    f.note('fx', 15, 0, 16, 60, 0.26, s='short'); tomfill(f, 15)

    # ---- c: fight. The orbit: everything in 3 + 3 + 2
    c = s.section('c', 16, next='b')
    for b in range(16):
        sym = ORBIT_CH[b % 8]; frm = ORBIT_CH[(b - 1) % 8]
        bed(c, b, sym, 1.0); stack(c, b, sym, frm, 1.0); bass(c, b, sym, 'tres', frm)
        c.hits('kick', b, 'x..x..x.x..x..x.', v=0.9)
        c.hits('snare', b, '....x.......x...' if b != 15 else '....x...x.x.xxxx')
        c.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.85)
        legato(c, 'lead', b, ORBIT[b % 8], 1.0); sing(c, 'strings', b, ORBIT[b % 8], 0.85)
        c.line('star', b, ORBIT[b % 8], 0.55)
        if b >= 8:
            c.line('lead', b, third(ORBIT[b % 8], 'C'), 0.5, octave=-1)
            tones = chord(sym, 4) + chord(sym, 5)                # the stars running: up the chord and back, in sixteenths
            for n in range(16): c.note('pulse', b, n, 0.8, tones[[0, 1, 2, 3, 4, 5, 4, 3][n % 8]], 0.8 if n % 4 == 0 else 0.62)
        else: ost(c, b, sym, 0.8)
        if b % 2 == 0: c.note('timp', b, 0, 6, tp(sym), 0.85)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.2, s='boom')
    c.note('crash', 4, 0, 1, 60, 0.6); c.note('crash', 12, 0, 1, 60, 0.6)
    c.note('fx', 0, 0, 1, 60, 0.26, s='ice'); c.note('fx', 14, 0, 32, 60, 0.2, s='riser')
    c.note('timp', 14, 0, 6, tp('G'), 0.85); c.note('timp', 15, 0, 6, tp('G'), 0.9)
    tomfill(c, 15, 8)

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
