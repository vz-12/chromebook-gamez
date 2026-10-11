"""hive: THE HIVE, sector 03 (MUSIC-PLAN.md). Infested. Everything in it has too many legs: the rhythm is
shakers, a scraped guiro and bursts of tiny taps instead of hats, a spider's steps and something
scuttling come and go at the edges, an insect chatter sits under all of it, and the tune crawls: it turns
around each note by a semitone before it moves. Swung. 126 BPM, F sharp minor, with a G where it hurts.

  intro  4 bars, once     the dark: slow steps, a drone that is not quite in tune, the chatter rising
  a      16 bars, calm    a sparse swung pulse, the bass creeping by semitones, the tune picked out on
                          something that clicks
  b      16 bars, fight   the nest awake: the tune on a buzzing lead, scuttles on every phrase
  c      16 bars, fight   the brood: half time, drums on the toms, a choir holding each chord, a long
                          sliding melody over it; falls back into b

Nearest reference: Blood Coagulant (drum-forward and skittering).
"""
import math
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, gate, fade
from inst import hit, synth, sampler, skitter, clips, riser, reverse, boom
from scores._common import third, kit, hive

TITLE = 'The Walls Are Moving'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the tune: a bar a line. Each bar opens by turning around its note (up a semitone, back, down a semitone)
CRAWL = ['F#4:2 G4:1 F#4:1 E#4:2 F#4:2 A4:2 C#5:2 C5:2 B4:2',
         'A4:2 G#4:1 A4:1 B4:2 A4:2 G#4:2 F#4:2 E#4:2 F#4:2',
         'G4:2 A4:1 G4:1 F#4:2 G4:2 B4:2 D5:2 C#5:2 B4:2',
         'A4:2 G#4:1 A4:1 C#5:4 r:2 C5:2 B4:2 A4:2',
         'F#4:2 G4:1 F#4:1 E#4:2 F#4:2 A4:2 C#5:2 C5:2 B4:2',
         'C#5:2 D5:1 C#5:1 B#4:2 C#5:2 E5:2 F#5:2 E5:2 C#5:2',
         'D5:2 E5:1 D5:1 C#5:2 D5:2 F#5:2 A5:2 G#5:2 F#5:2',
         'E#5:2 F#5:1 E#5:1 D5:2 C#5:2 B4:2 G#4:2 E#4:2 C#4:2']
CRAWL_CH = ['F#m', 'F#m', 'G', 'F#m', 'F#m', 'F#m', 'D', 'C#']
# the brood's answer: long notes, slid into from below, climbing each time
BROOD = ['C#5:8 r:2 A4:2 G#4:2 A4:2',
         'F#5:8 r:2 D5:2 C#5:2 D5:2',
         'B4:6 D5:6 F#5:4',
         'E#5:8 G#5:4 C#6:4',
         'A5:8 r:2 F#5:2 E#5:2 F#5:2',
         'A5:8 r:2 F#5:2 E5:2 D5:2',
         'G5:6 B5:6 D6:4',
         'C#6:4 B5:2 G#5:2 E#5:2 C#5:2 B4:2 G#4:2']
BROOD_CH = ['F#m', 'D', 'Bm', 'C#', 'F#m', 'D', 'G', 'C#']
BASS = {'F#m': 'F#2', 'G': 'G2', 'D': 'D2', 'C#': 'C#2', 'Bm': 'B1'}

def song():
    K = kit(); H = hive()
    s = Song('hive', 126, swing=0.62, target=-12.0, ceil=-1.5, room=dict(decay=2.4, pre=0.02, bright=5500.0, dark=1300.0),
             master=lambda x: highshelf(hp(x, 30.0), 9000.0, -2.0))
    s.add('kick', Bus(hit(K['kick_e']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.52, rev=0.14, fx=[lambda x: clip(x, 0.7)]))
    s.add('rattle', Bus(hit(H['rattle']), gain=0.6, rev=0.2, fx=[lambda x: hp(x, 1500.0)]))
    s.add('cab', Bus(hit(H['cabasa'], human=0.004), gain=0.34, fx=[lambda x: hp(x, 1200.0)]))
    s.add('ridge', Bus(hit(H['ridge'], human=0.002), gain=0.55, rev=0.1, fx=[lambda x: hp(x, 900.0)]))
    s.add('clave', Bus(hit(H['clave']), gain=0.62, dly=0.35, rev=0.25, fx=[lambda x: hp(x, 600.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.22, fx=[lambda x: clip(x, 0.7)]))
    s.add('crash', Bus(hit(K['china']), gain=0.2, rev=0.25, fx=[lambda x: hp(x, 400.0)]))
    s.add('legs', Bus(skitter(tone=3800.0), gain=1.1, rev=0.18, dly=0.1, fx=[lambda x: clip(x, 0.5)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.05, spread=0.0, sq=0.35, cutoff=400.0, env=2.6, fdecay=0.12, res=1.3,
                            track=0.3, a=0.004, d=0.12, s=0.8, r=0.05, dirt=0.6, glide=0.05),
                      gain=0.26, duck=0.5, fx=[lambda x: peak(hp(x, 40.0), 650.0, 3.0, 1.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.16, spread=1.0, cutoff=780.0, track=0.2, a=0.4, d=0.5, s=0.9, r=0.5, drift=26.0),
                     gain=0.2, rev=0.5, duck=0.45, fx=[lambda x: hp(x, 160.0)]))
    s.add('pluck', Bus(synth('square', pw=0.22, cutoff=2100.0, env=4.0, fdecay=0.045, res=1.6, a=0.001, d=0.07, s=0.0, r=0.06),
                       gain=0.52, dly=0.32, rev=0.28, fx=[lambda x: hp(x, 300.0)]))
    s.add('lead', Bus(synth('saw', voices=2, detune=0.1, spread=0.35, sq=0.4, cutoff=2600.0, env=1.2, fdecay=0.2, res=1.4,
                            a=0.005, d=0.16, s=0.8, r=0.1, vib=0.1, dirt=0.35, buzz=0.5, buzzhz=92.0, glide=0.09),
                      gain=0.26, dly=0.24, rev=0.22, duck=0.12, fx=[lambda x: hp(x, 250.0)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.5), gain=0.24, rev=0.55, duck=0.2, fx=[lambda x: hp(x, 150.0)]))
    table = {'boom': boom(), 'riser': riser(2 * s.bar, lo=300.0, hi=7000.0), 'rev': reverse(K['crash'], 1.5),
             'wings': H['wings'][0], 'wings2': H['wings'][1], 'chit': H['chit'][0], 'cry': H['chit'][1],
             'swarm': H['swarm'], 'moth': H['moth'], 'squish': H['squish'], 'suck': H['suck'], 'goo': H['goo'],
             'guiro': H['guiro'], 'swish': H['swish'], 'spider': H['spider'][3], 'brood': gate(H['brood'], s.bar * 0.98, 0.5)}
    for i in range(4): table[f'scut{i}'] = H['scut'][i]
    for i in range(3): table[f'step{i}'] = H['spider'][i]
    s.add('fx', Bus(clips(table), gain=1.7, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def bass(sec, bar, sym, mode):
        r = midi(BASS[sym])
        if mode == 'creep':        # leans on the note above, then the note below
            for at, d, p, sl in ((0, 3, r, 0), (3, 1, r, 0), (6, 1, r + 1, 0), (7, 1, r, 1), (10, 2, r - 1, 0), (12, 2, r, -1)):
                sec.note('bass', bar, at, d * 0.9, p, 0.85, slide=sl, open=0.7)
        elif mode == 'run':        # sixteenths, the octave and both neighbours thrown in
            line = [0, 0, 12, 0, 1, 0, 12, 0, 0, 0, -1, 0, 0, 7, 12, 0]
            for i, k in enumerate(line): sec.note('bass', bar, i, 0.9, r + k, 1.0 if i % 4 == 0 else 0.8, slide=(-1 if k == 1 else 1 if k == -1 else 0))
        else:                      # held, sliding up to the fifth and back
            sec.note('bass', bar, 0, 6, r, 1.0); sec.note('bass', bar, 6, 2, r, 0.85)
            sec.note('bass', bar, 8, 4, r + 7, 0.9, slide=-7); sec.note('bass', bar, 12, 4, r, 0.95, slide=7)
    def pad(sec, bar, sym, v=1.0): sec.chordn('pad', bar, 0, 15.5, sym, 3, v)
    def roll(sec, bar, at, n=4, v=0.9):
        """A guiro's ridges, four to the eighth: the hats' place taken by something scraping."""
        for i in range(n): sec.note('ridge', bar, at + i * 0.5, 0.5, 60, v * (0.55 + 0.45 * i / max(1, n - 1)))
    def scuttle(sec, bar, at, k, v=0.5): sec.note('fx', bar, at, 4, 60, v, s=f'scut{k % 4}')
    def voices(sec, bar, sym, v=0.8):
        """The choir on the chord, every voice folded into the octave and a half its recordings reach."""
        for m in chord(sym, 4):
            while m > 67: m -= 12
            while m < 56: m += 12
            sec.note('choir', bar, 0, 15, m, v)

    # ---- intro: the dark
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    i.note('fx', 0, 0, 1, 60, 0.6, s='spider'); i.note('fx', 0, 0, 1, 60, 0.3, s='swarm'); i.note('fx', 0, 0, 1, 60, 0.13, s='boom')
    i.note('fx', 0, 0, 1, 60, 0.3, s='brood'); i.note('fx', 1, 0, 1, 60, 0.36, s='brood')
    for b in range(4):
        pad(i, b, 'F#m', 0.55 + 0.12 * b)
        i.note('bass', b, 0, 15, midi('F#2'), 0.5, open=0.35 + 0.15 * b)
    i.hits('clave', 1, 'x.....x.........', v=0.8); i.hits('clave', 2, 'x..x..x...x.x...', v=0.8); i.hits('clave', 3, 'x..x..x...x.x...', v=0.9)
    i.note('legs', 1, 8, 5, 60, 0.7, n=11, curve=0.8); i.note('legs', 2, 10, 4, 67, 0.7, n=9, curve=1.3)
    i.hits('kick', 2, 'x.........x.....', v=0.75); i.hits('kick', 3, 'x.....x...x.....', v=0.85)
    i.hits('cab', 3, 'xoxoxoxoxoxoxoxo', v=0.7); roll(i, 3, 12, 8)
    scuttle(i, 2, 4, 1, 0.5); i.note('legs', 3, 4, 8, 60, 0.8, n=24, curve=0.7)
    i.note('fx', 2, 0, 32, 60, 0.15, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.6, s='wings', lead=1.3 - 0.01 * s.step)

    # ---- a: calm. A sparse pulse, the bass creeping, the tune on something that clicks
    a = s.section('a', 16, level=-3.5)
    for b in range(16):
        sym = CRAWL_CH[b % 8]
        pad(a, b, sym, 0.7); bass(a, b, sym, 'creep')
        a.hits('kick', b, 'x.....x...x.....' if b % 2 == 0 else 'x.........x..x..')
        a.hits('clave', b, 'x..x..x...x.x...' if b % 2 == 0 else '..x..x....x.x...', v=0.75)
        a.hits('cab', b, 'xoxoxoxoxoxoxoxo', v=0.7 if b < 8 else 0.85)
        if b % 2 == 1: roll(a, b, 14, 4, 0.8); a.note('legs', b, 10, 4, 60 + (7 if b % 4 == 3 else 0), 0.75, n=12, curve=0.8)
        if b % 4 == 0: a.note('fx', b, 0, 1, 60, 0.26, s='swarm')
        if b % 2 == 0: scuttle(a, b, 6, b // 2, 0.5); a.note('legs', b, 3, 1.5, 72, 0.65, n=5); a.note('legs', b, 13, 2, 64, 0.6, n=6, curve=1.3)
        if b % 8 == 5: a.note('fx', b, 12, 4, 60, 0.3, s='guiro')
    a.note('fx', 0, 0, 1, 60, 0.09, s='boom'); a.note('fx', 4, 8, 4, 60, 0.4, s='step0'); a.note('fx', 8, 2, 4, 60, 0.4, s='step1'); a.note('fx', 12, 8, 4, 60, 0.4, s='step2')
    a.note('fx', 3, 12, 4, 60, 0.3, s='wings2'); a.note('fx', 11, 12, 4, 60, 0.3, s='wings2')
    for b, text in [(0, 'F#4:2 G4:1 F#4:1 E#4:2 F#4:10'), (2, 'G4:2 A4:1 G4:1 F#4:2 G4:10'), (4, 'F#4:2 G4:1 F#4:1 E#4:2 F#4:10'), (6, 'D5:2 E5:1 D5:1 C#5:2 D5:10')]:
        a.line('pluck', b, text, 0.8)
    for b in range(8): a.line('pluck', 8 + b, CRAWL[b], 0.9)
    a.note('fx', 7, 12, 4, 60, 0.3, s='chit'); a.note('fx', 15, 15.99, 1, 60, 0.5, s='wings', lead=1.3 - 0.01 * s.step)

    # ---- b: fight. The nest awake
    f = s.section('b', 16, next='c')
    for b in range(16):
        sym = CRAWL_CH[b % 8]
        pad(f, b, sym, 0.8); bass(f, b, sym, 'run')
        f.hits('kick', b, 'x..x..x...x.x...' if b % 2 == 0 else 'x..x..x..x..x.x.')
        f.hits('snare', b, '....x.......x...' if b != 15 else '....x.......x.xx')
        f.hits('rattle', b, '....x.......x...', v=0.8)
        f.hits('cab', b, 'xoxoxoxoxoxoxoxo', v=1.0)
        f.hits('clave', b, '..x..x....x.....', v=0.7)
        roll(f, b, 6, 4, 0.8); roll(f, b, 14, 4, 0.95)
        if b % 2 == 0: f.note('legs', b, 10, 4, 60, 0.8, n=14, curve=0.75)
        else: scuttle(f, b, 8, b, 0.55); f.note('legs', b, 2, 2, 67, 0.7, n=7)
        if b % 4 == 0: f.note('fx', b, 0, 1, 60, 0.2, s='swarm')
        f.line('lead', b, CRAWL[b % 8], 1.0)
        if b >= 8: f.line('lead', b, third(CRAWL[b % 8], 'F#'), 0.5); f.line('pluck', b, CRAWL[b % 8], 0.6, octave=1)
    for b in (0, 4, 8, 12): f.note('crash', b, 0, 1, 60, 1.0 if b in (0, 8) else 0.6)
    f.note('fx', 0, 0, 1, 60, 0.12, s='boom'); f.note('fx', 8, 0, 1, 60, 0.08, s='boom')
    f.note('fx', 7, 10, 6, 60, 0.32, s='cry'); f.note('fx', 15, 8, 4, 60, 0.32, s='chit')
    f.note('legs', 15, 8, 8, 60, 0.9, n=30, curve=0.65); f.note('fx', 15, 15.99, 1, 60, 0.5, s='wings', lead=1.3 - 0.01 * s.step)

    # ---- c: fight. The brood: half time, toms, a choir, a melody that slides
    c = s.section('c', 16, next='b')
    for b in range(16):
        sym = BROOD_CH[b % 8]
        pad(c, b, sym, 0.9); bass(c, b, sym, 'held'); voices(c, b, sym, 0.8 if b < 8 else 0.95)
        c.hits('kick', b, 'x.....x.x.......')
        c.hits('snare', b, '........x.......' if b != 15 else '........x...xxxx')
        c.hits('rattle', b, '........x.......', v=0.9)
        for k, at in enumerate((2, 3, 5, 10, 11, 13, 14)): c.note('tom', b, at, 1, 60, 0.7 if k % 2 else 0.85, semi=(-5, 0, 5)[(k + b) % 3])
        c.hits('cab', b, 'x.x.x.x.x.x.x.x.', v=0.8)
        if b % 4 == 0: c.note('fx', b, 0, 1, 60, 0.22, s='moth')
        if b % 2 == 1: c.note('legs', b, 12, 4, 55, 0.75, n=12, curve=0.8)
        if sym == 'F#m': c.note('fx', b, 0, 1, 60, 0.3, s='brood')
        for tok_at, tok in zip(_starts(BROOD[b % 8]), BROOD[b % 8].split()):
            name, _, d = tok.partition(':')
            if name != 'r': c.note('lead', b, tok_at, float(d), midi(name), 1.0, slide=(-1 if float(d) >= 6 else 0))
        if b >= 8: c.line('lead', b, third(BROOD[b % 8], 'F#'), 0.45)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.12, s='boom')
    c.note('fx', 3, 8, 4, 60, 0.4, s='suck'); c.note('fx', 7, 12, 4, 60, 0.4, s='squish'); c.note('fx', 11, 8, 4, 60, 0.4, s='goo')
    c.note('fx', 5, 4, 4, 60, 0.4, s='step1'); c.note('fx', 13, 4, 4, 60, 0.4, s='step0')
    c.note('legs', 15, 8, 8, 60, 0.9, n=28, curve=0.65); c.note('fx', 15, 15.99, 1, 60, 0.5, s='wings', lead=1.3 - 0.01 * s.step)

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s

def _starts(text):
    """Where each note of a written line begins, in 16ths."""
    at, out = 0.0, []
    for tok in text.split():
        out.append(at); at += float(tok.partition(':')[2] or 1)
    return out
