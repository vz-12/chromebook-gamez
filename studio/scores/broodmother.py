"""broodmother: BROODMOTHER, THE HIVE's boss (MUSIC-PLAN.md). THE HIVE's crawling tune on down-tuned
guitars: a bounce that leans on the note a semitone up, hats that skitter in thirty-second notes, a
choir that creeps in under it, and her brood scuttling through all of it. No intro. 145 BPM, F sharp minor.

  p1  16 bars  half time: the bounce alone, the brood at its edges; the tune from bar nine
  p2  16 bars  full time: guitars crawling by semitones under the brood's long sliding answer, the
               choir on every chord
  p3  16 bars  all of her: sixteenths with a chord on every beat and a stab a semitone up, the tune in
               harmony, the choir, legs on every bar, double kicks to finish

Nearest reference: Murderswarm (short, narrow, bright; a groove that creeps).
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, gate, clip
from inst import hit, synth, guitar, amp, sampler, skitter, clips, riser, reverse, boom
from scores._common import third, kit, hive, riff, tomfill
from scores.hive import CRAWL, CRAWL_CH, BROOD, BROOD_CH, _starts

TITLE = 'Mother of Thousands'
ORDER = ['p1', 'p2', 'p3', 'p3']
ROOT = {'F#m': 'F#2', 'G': 'G2', 'D': 'D2', 'C#': 'C#2', 'Bm': 'B1'}
NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
def up(note, k):
    """A note name `k` semitones away, as riff() wants it written."""
    m = int(midi(note)) + k
    return f'{NOTES[m % 12]}{m // 12 - 1}'

def song():
    K = kit(); H = hive()
    s = Song('broodmother', 145, target=-10.0, ceil=-1.5, room=dict(decay=1.8, pre=0.012, bright=5800.0, dark=1500.0),
             master=lambda x: highshelf(hp(x, 32.0), 8500.0, -2.0))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.55, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.55, rev=0.14, fx=[lambda x: clip(x, 0.7)]))
    s.add('rattle', Bus(hit(H['rattle']), gain=0.5, rev=0.2, fx=[lambda x: hp(x, 1500.0)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.32, fx=[lambda x: hp(x, 500.0)]))
    s.add('cab', Bus(hit(H['cabasa'], human=0.003), gain=0.26, fx=[lambda x: hp(x, 1200.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.2, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.22, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.18, fx=[lambda x: clip(x, 0.7)]))
    s.add('legs', Bus(skitter(tone=3800.0), gain=0.9, rev=0.15, fx=[lambda x: clip(x, 0.5)]))
    # the recording of the low F has a major third in it. Replayed a semitone up for F sharp it would turn
    # this key major, so here the F sharp comes from the G instead, which is a bare fifth
    chugs = {r: x for r, x in K['chugs'].items() if r != midi('F2')}
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.6), gain=0.56, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.06, spread=0.0, sq=0.45, cutoff=520.0, env=2.5, fdecay=0.09,
                            res=1.0, track=0.3, a=0.003, d=0.09, s=0.8, r=0.04, dirt=0.8),
                      gain=0.3, duck=0.35, fx=[lambda x: peak(hp(x, 40.0), 700.0, 2.5, 1.0)]))
    s.add('lead', Bus(synth('saw', voices=2, detune=0.1, spread=0.3, sq=0.45, cutoff=2900.0, env=1.4, fdecay=0.2, res=1.3,
                            a=0.005, d=0.18, s=0.85, r=0.11, vib=0.14, dirt=0.55, buzz=0.4, buzzhz=92.0, glide=0.09),
                      gain=0.21, dly=0.25, rev=0.22, fx=[lambda x: peak(hp(x, 250.0), 1800.0, 2.0, 1.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, cutoff=1400.0, track=0.2, a=0.05, d=0.4, s=0.9, r=0.3, drift=18.0),
                     gain=0.13, rev=0.4, duck=0.3, fx=[lambda x: hp(x, 200.0)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.4), gain=0.3, rev=0.5, duck=0.15, fx=[lambda x: hp(x, 150.0)]))
    table = {'boom': boom(), 'short': riser(s.bar, lo=600.0), 'rev': reverse(K['crash'], 1.4), 'wings': H['wings'][0],
             'chit': H['chit'][0], 'cry': H['chit'][1], 'squish': H['squish'], 'suck': H['suck'], 'goo': H['goo'],
             'swarm': H['swarm'], 'brood': gate(H['brood'], s.bar * 0.98, 0.4)}
    for i in range(4): table[f'scut{i}'] = H['scut'][i]
    s.add('fx', Bus(clips(table), gain=1.5, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def skit(sec, bar, v=0.9):
        """The hats: eighths, breaking into thirty-seconds before beats 3 and 1."""
        sec.hits('hat', bar, 'x.x.x.x.x.x.x.x.', v=v)
        for at in (6, 14):
            for i in range(4): sec.note('hat', bar, at + i * 0.5, 0.5, 60, v * (0.5 + 0.12 * i))
    def voices(sec, bar, sym, v=0.8):
        for m in chord(sym, 4):
            while m > 67: m -= 12
            while m < 56: m += 12
            sec.note('choir', bar, 0, 15, m, v)
    def scuttle(sec, bar, at, k, v=0.5): sec.note('fx', bar, at, 4, 60, v, s=f'scut{k % 4}')

    # ---- p1: half time. The bounce, leaning on the semitone above
    a = s.section('p1', 16, seg=2)
    for b in range(16):
        sym = CRAWL_CH[b % 8]; R = ROOT[sym]; N = up(R, 1); L = up(R, -1)
        if b % 2 == 0: riff(a, b, f'{R}*:2 r:1 {R}:1 {R}:1 r:1 {R}*:2 r:2 {R}:1 {R}:1 {N}*:2 {R}:1 r:1')
        else: riff(a, b, f'{R}*:2 r:1 {R}:1 {R}:1 r:1 {N}*:2 {R}*:2 r:1 {R}:1 {R}:1 {L}:1 {R}:2')
        a.hits('kick', b, 'x..xx.x...xx..x.' if b % 2 == 0 else 'x..xx.x.x..xxx..')
        if b != 15: a.hits('snare', b, '........x.......')
        a.hits('rattle', b, '........x.......', v=0.9)
        skit(a, b)
        a.hits('china', b, 'x.......x.......' if b % 2 == 0 else '........x.......', v=0.75)
        if b % 2 == 1: a.note('legs', b, 12, 4, 60, 0.85, n=14, curve=0.75)
        else: scuttle(a, b, 9, b // 2, 0.5)
        if b >= 8:
            a.line('lead', b, CRAWL[b % 8], 1.0)
            a.chordn('pad', b, 0, 15.5, sym, 3, 0.8)
    for b in (0, 8): a.note('crash', b, 0, 1, 60, 1.0); a.note('fx', b, 0, 1, 60, 0.18, s='boom'); a.note('fx', b, 0, 1, 60, 0.35, s='squish')
    a.note('crash', 4, 0, 1, 60, 0.7); a.note('crash', 12, 0, 1, 60, 0.7)
    a.note('fx', 7, 8, 8, 60, 0.3, s='cry')
    tomfill(a, 7); tomfill(a, 15, 8); a.hits('snare', 15, '........x.x.xxxx', v=0.95); a.note('legs', 15, 8, 8, 60, 0.9, n=26, curve=0.65)

    # ---- p2: full time. Guitars crawling by semitones; the brood's answer; the choir
    p = s.section('p2', 16, seg=2)
    for b in range(16):
        sym = BROOD_CH[b % 8]; R = ROOT[sym]; N = up(R, 1); L = up(R, -1)
        riff(p, b, f'{R}:1 {R}:1 {R}:1 {R}:1 {N}:1 {N}:1 {R}:1 {R}:1 {L}:1 {L}:1 {R}:1 {R}:1 {R}*:4')
        p.hits('kick', b, 'x.xx..x.x.xx..x.')
        if b != 15: p.hits('snare', b, '....x.......x...')
        p.hits('rattle', b, '....x.......x...', v=0.8)
        skit(p, b); p.hits('cab', b, 'xoxoxoxoxoxoxoxo', v=0.8)
        p.chordn('pad', b, 0, 15.5, sym, 3, 0.9); voices(p, b, sym, 0.8 if b < 8 else 1.0)
        if sym == 'F#m': p.note('fx', b, 0, 1, 60, 0.25, s='brood')
        if b % 2 == 1: p.note('legs', b, 12, 4, 55, 0.85, n=14, curve=0.75)
        for at, tok in zip(_starts(BROOD[b % 8]), BROOD[b % 8].split()):
            name, _, d = tok.partition(':')
            if name != 'r': p.note('lead', b, at, float(d), midi(name), 1.0, slide=(-1 if float(d) >= 6 else 0))
        if b >= 8: p.line('lead', b, third(BROOD[b % 8], 'F#'), 0.5)
    for b in range(0, 16, 4): p.note('crash', b, 0, 1, 60, 1.0 if b % 8 == 0 else 0.7)
    for b in range(2, 16, 4): p.note('china', b, 0, 1, 60, 0.8)
    p.note('fx', 0, 0, 1, 60, 0.18, s='boom'); p.note('fx', 8, 0, 1, 60, 0.13, s='boom')
    p.note('fx', 3, 8, 4, 60, 0.35, s='suck'); p.note('fx', 11, 8, 4, 60, 0.35, s='goo')
    for b in (1, 5, 9, 13): scuttle(p, b, 4, b, 0.5)
    tomfill(p, 7); tomfill(p, 15, 8); p.hits('snare', 15, '....x...x.x.xxxx', v=0.95); p.note('fx', 15, 0, 16, 60, 0.2, s='short')

    # ---- p3: all of her
    q = s.section('p3', 16, seg=2)
    for b in range(16):
        sym = CRAWL_CH[b % 8]; R = ROOT[sym]; N = up(R, 1)
        riff(q, b, f'{R}*:1 {R}:1 {R}:1 {R}:1 {R}*:1 {R}:1 {R}:1 {R}:1 {R}*:1 {R}:1 {R}:1 {R}:1 {N}*:2 {R}:1 {R}:1')
        q.hits('kick', b, 'x.xx..x.x.xx..x.' if b < 8 else 'xxxxxxxxxxxxxxxx', v=1.0 if b < 8 else 0.88)
        if b != 15: q.hits('snare', b, '....x.......x...')
        q.hits('rattle', b, '....x.......x...', v=0.9)
        skit(q, b); q.hits('china', b, 'x...x...x...x...', v=0.65)
        q.chordn('pad', b, 0, 15.5, sym, 3, 1.0); voices(q, b, sym, 1.0)
        if sym == 'F#m': q.note('fx', b, 0, 1, 60, 0.28, s='brood')
        q.note('legs', b, 10 if b % 2 == 0 else 2, 5, 60 if b % 2 == 0 else 67, 0.9, n=16, curve=0.75)
        if b % 2 == 1: scuttle(q, b, 8, b, 0.55)
        q.line('lead', b, CRAWL[b % 8], 1.0); q.line('lead', b, third(CRAWL[b % 8], 'F#'), 0.55)
        if b >= 8: q.line('lead', b, CRAWL[b % 8], 0.5, octave=1)
    for b in range(0, 16, 4): q.note('crash', b, 0, 1, 60, 1.0)
    q.note('fx', 0, 0, 1, 60, 0.2, s='boom'); q.note('fx', 8, 0, 1, 60, 0.16, s='boom'); q.note('fx', 0, 0, 1, 60, 0.35, s='squish')
    q.note('fx', 7, 8, 8, 60, 0.3, s='cry'); q.note('fx', 3, 8, 4, 60, 0.3, s='chit')
    tomfill(q, 7, 8); tomfill(q, 15, 8); q.hits('snare', 15, 'x.x.x.x.xxxxxxxx', v=0.9); q.note('legs', 15, 8, 8, 60, 1.0, n=30, curve=0.65)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    return s
