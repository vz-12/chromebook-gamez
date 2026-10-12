"""backlog: THE BACKLOG, THE PATCH's boss (MUSIC-PLAN.md). Everything he ever bought on sale and never
finished, in a heap. His theme is THE PATCH's jig as metal, and for most of it the tune is not finished
either: it is started and put down, a bar at a time, each time one note short of its ending. In the middle
the phrases are handed from one instrument to the next before they are done. Only at the end, when the
finishing is being done for him, is the jig played whole, and its last bar comes home for the only time.
165 BPM, four beats of three, D minor.

  intro  4 bars, once  the heap: a tuba and a kettledrum; the tune's first notes three times, on three
                       instruments, each getting one note further and stopping
  p1     16 bars       started, and put down: the tune a bar at a time, each bar cut off before its last
                       note, the band answering in the gaps; second time round two bars at a time
  p2     16 bars       the binge: both feet running, the bass going down by semitones, THE PATCH's long
                       line handed from the lead to the harpsichord half-way through every bar; then
                       the lead takes all of it
  p3     16 bars       finished for him: the whole jig, in thirds the second time, and a last bar that
                       lands on D

"One day."
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, organ
from scores._common import third, kit, hallows, riff, legato, bones, harpsichord, pipes
from scores.patch import JIG, JIG_CH, FALL, LANTERN, ROOT, PAH

TITLE = "I'll Get to It"
ORDER = ['intro', 'p1', 'p2', 'p3', 'p3']

def cut(text, n=1):
    """A line put down before it is done: its last n notes are not played."""
    toks = text.split(); gone = sum(float(t.partition(':')[2] or 1) for t in toks[-n:])
    return ' '.join(toks[:-n]) + f' r:{gone:g}'
def hand(text, at=6):
    """A line handed over: what begins before step `at`, and what begins after it."""
    a, b, pos = [], [], 0.0
    for tok in text.split():
        d = float(tok.partition(':')[2] or 1)
        (a if pos < at else b).append(tok); (b if pos < at else a).append(f'r:{d:g}')
        pos += d
    return ' '.join(a), ' '.join(b)

# p1: which bars have the tune in them, and how much of it
STARTED = {0: cut(JIG[0]), 2: cut(JIG[2]), 4: cut(JIG[4]), 6: cut(JIG[6], 2),
           8: JIG[0], 9: cut(JIG[1], 2), 10: cut(JIG[2]), 12: JIG[4], 13: cut(JIG[5]), 14: cut(JIG[6], 2)}

def song():
    K = kit(); H = hallows()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 165
    s = Song('backlog', 165, steps=12, target=-10.0, ceil=-2.0, room=dict(decay=2.0, pre=0.02, bright=6000.0, dark=1500.0),
             echo=dict(time=beat, fb=0.28, taps=3), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.58, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('dkick', Bus(hit(K['kick_m']), gain=0.6, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.7, rev=0.14, fx=[lambda x: clip(x, 0.65)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=1.0, fx=[lambda x: clip(hp(x, 500.0), 0.4)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.32, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.24, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(H['timp'], rel=0.5), gain=0.45, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    s.add('tuba', Bus(sampler(H['tuba'], rel=0.12), gain=0.6, rev=0.12, fx=[lambda x: clip(lp(peak(hp(x, 45.0), 240.0, 3.0, 1.0), 330.0), 0.7)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.38, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('harpsi', Bus(harpsichord(), gain=0.7, rev=0.2, dly=0.1, fx=[lambda x: clip(hp(x, 180.0), 0.45)]))
    s.add('bones', Bus(bones(), gain=0.32, rev=0.2, dly=0.12, fx=[lambda x: hp(x, 400.0)]))
    s.add('organ', Bus(organ(trem=0.2), gain=0.3, rev=0.3, duck=0.15, fx=[lambda x: clip(hp(x, 120.0), 0.6)]))
    s.add('pipes', Bus(pipes(), gain=0.5, rev=0.3, duck=0.15, fx=[lambda x: hp(x, 100.0)]))                  # the cathedral organ, on the chords' roots
    s.add('lead', Bus(synth('saw', voices=3, detune=0.12, spread=0.45, sq=0.4, cutoff=2900.0, env=1.2, fdecay=0.2, res=1.2,
                            a=0.005, d=0.16, s=0.85, r=0.08, vib=0.12, vibat=0.2, glide=0.07, dirt=0.35),
                      gain=0.26, dly=0.2, rev=0.2, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.5), gain=0.26, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.5),
                           'thunder': H['thunder']}), gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def held(sec, bus, bar, sym, v=1.0, lo=50, hi=65, at=0, dur=11.5):
        for m in chord(sym, 3):
            while m < lo: m += 12
            while m > hi: m -= 12
            sec.note(bus, bar, at, dur, m, v)
    def pipe(sec, bar, sym, v=0.8, at=0, dur=11.5):
        sec.note('pipes', bar, at, dur, root(sym) + 12, v, kind='minor' if sym.endswith('m') else 'fifth')
    def skank(sec, bar, sym, v=1.0, at=(3, 9)):
        for a in at:
            for m in PAH[sym]: sec.note('organ', bar, a, 1.6, m, v)
    def shuffle(g): return f'{g}*:2 {g}:1 {g}:2 {g}:1 {g}*:2 {g}:1 {g}:2 {g}:1'
    def gallop(g): return ' '.join(f'{g}*:2 {g}:1 {g}:1 {g}:1 {g}:1' for _ in range(2))
    def run(g): return ' '.join(f'{g}*:1 {g}:1 {g}:1' for _ in range(4))
    def fill(sec, bar, at=9):
        for n, semi in enumerate((7, 2, -5)): sec.note('tom', bar, at + n, 1, 60, 0.8 + 0.06 * n, semi=semi)

    # ---- intro: the heap. Three starts, each one note further, none finished
    i = s.section('intro', 4, loop=False, next='p1', lock=True)
    i.note('fx', 0, 0, 1, 60, 0.3, s='thunder'); i.note('fx', 0, 0, 1, 60, 0.2, s='boom')
    for b in range(3):
        i.note('tuba', b, 0, 2.5, 38, 0.7 + 0.08 * b); i.note('tuba', b, 6, 2.5, 45, 0.65 + 0.08 * b)
        i.note('timp', b, 0, 4, 38, 0.6 + 0.1 * b)
        if b >= 1: i.hits('kick', b, 'x.....x.....', v=0.7)
    i.line('harpsi', 0, 'D5:2 A5:1 Bb5:2 A5:1 r:6', 0.9, octave=-1)
    i.line('bones', 1, 'D5:2 A5:1 Bb5:2 A5:1 F5:2 r:4', 1.0)
    i.line('lead', 2, 'D5:2 A5:1 Bb5:2 A5:1 F5:2 E5:1 r:3', 0.9)
    riff(i, 3, 'A1*:6 A1*:3 A1:1 A1:1 A1:1'); held(i, 'organ', 3, 'A', 0.5); pipe(i, 3, 'A', 0.8)
    i.note('tuba', 3, 0, 2.5, 33, 0.9); i.note('timp', 3, 0, 4, 45, 0.8); i.note('timp', 3, 6, 3, 45, 0.85)
    i.hits('kick', 3, 'x.....x..x..', v=0.85); i.hits('snare', 3, '...x..x..xxx', v=0.7)
    i.note('fx', 2, 0, 24, 60, 0.2, s='riser'); i.note('fx', 3, 11.99, 1, 60, 0.26, s='rev', lead=1.5 - 0.01 * s.step)

    # ---- p1: started, and put down
    p = s.section('p1', 16, seg=4)
    for b in range(16):
        k = b % 8; sym = JIG_CH[k]; g = ROOT[sym]; tune = STARTED.get(b)
        riff(p, b, shuffle(g) if tune else gallop(g))
        p.note('tuba', b, 0, 2.5, root(sym), 0.8)
        p.hits('kick', b, 'x....xx....x' if tune else 'x.x..xx.x..x')
        p.hits('snare', b, '...x.....x..' if b != 15 else '...x..x..xxx')
        p.hits('hat', b, 'x.ox.ox.ox.o', v=0.85)
        if tune:
            p.line('lead', b, tune, 1.0); p.line('harpsi', b, tune, 0.9, octave=-1)
            skank(p, b, sym, 0.9)
        else:                       # nobody is playing the tune: the band, in the gap
            held(p, 'organ', b, sym, 0.6, at=0, dur=2.5); held(p, 'organ', b, sym, 0.55, at=6, dur=2.5)
            pipe(p, b, sym, 0.95, at=0, dur=2.5); pipe(p, b, sym, 0.85, at=6, dur=2.5)
            p.hits('china', b, 'x.....x.....', v=0.7)
    for b in (0, 8): p.note('crash', b, 0, 1, 60, 1.0); p.note('fx', b, 0, 1, 60, 0.16, s='boom')
    for b in (4, 12): p.note('crash', b, 0, 1, 60, 0.6)
    fill(p, 7); fill(p, 15); p.note('fx', 14, 0, 24, 60, 0.18, s='riser')

    # ---- p2: the binge. The long line, handed on before it is done
    q = s.section('p2', 16, seg=4)
    prev = None
    for b in range(16):
        k = b % 8; sym, low = FALL[k]; g = ROOT[sym]; second = b >= 8
        riff(q, b, run(g), bass=False)
        dull = dict(open=0.55) if k in (1, 3) else {}          # under a chord's third the bass is kept dull: its own overtones spell another chord
        for n in range(6): q.note('bass', b, n * 2, 1.7, midi(low), 1.0 if n % 3 == 0 else 0.82, **dull)
        pipe(q, b, sym, 0.85); held(q, 'organ', b, sym, 0.5); held(q, 'choir', b, sym, 0.75 if not second else 0.95, lo=55, hi=68)
        q.hits('dkick', b, 'xoxoxoxoxoxo', v=0.85, len=0.09); q.hits('kick', b, 'x.....x.....')
        q.hits('snare', b, '...x.....x..' if b != 15 else '...x..x..xxx')
        q.hits('china', b, 'x..x..x..x..', v=0.6)
        if not second:
            mine, yours = hand(LANTERN[k])
            prev = legato(q, 'lead', b, mine, 1.0, most=12, prev=None)
            q.line('harpsi', b, yours, 1.3, octave=-1); q.line('bones', b, yours, 0.9)
        else:
            prev = legato(q, 'lead', b, LANTERN[k], 1.0, most=12, prev=prev)
            q.line('lead', b, third(LANTERN[k], 'D'), 0.4)
            for at in (3, 9):
                for n, m in enumerate(PAH[sym]): q.note('harpsi', b, at + n, 1, m, 0.6 + 0.08 * n)
    for b in (0, 8): q.note('crash', b, 0, 1, 60, 1.0); q.note('fx', b, 0, 1, 60, 0.18, s='boom')
    q.note('fx', 0, 0, 1, 60, 0.25, s='thunder')
    q.note('timp', 7, 6, 3, 45, 0.8); q.note('timp', 7, 9, 3, 45, 0.9)
    fill(q, 7); fill(q, 15); q.note('fx', 14, 0, 24, 60, 0.2, s='riser')

    # ---- p3: finished for him. The whole jig, and a last bar that comes home
    r = s.section('p3', 16, seg=4)
    for b in range(16):
        k = b % 8; sym = JIG_CH[k]; g = ROOT[sym]; second = b >= 8; last = b == 15
        tune = 'E5:2 C#5:1 A5:3 D6:6' if last else JIG[k]
        if last:
            riff(r, b, 'A1*:2 A1:1 A1*:3 D2*:6')
            held(r, 'organ', b, 'A', 0.6, dur=5.5); held(r, 'organ', b, 'Dm', 0.6, at=6, dur=5.5)
            pipe(r, b, 'A', 0.9, dur=5.5); pipe(r, b, 'Dm', 1.0, at=6, dur=5.5)
            held(r, 'choir', b, 'A', 0.9, lo=55, hi=68, dur=5.5); held(r, 'choir', b, 'Dm', 1.0, lo=55, hi=68, at=6, dur=5.5)
            r.note('timp', b, 0, 3, 45, 0.9); r.note('timp', b, 6, 6, 38, 1.0)
            r.hits('kick', b, 'x..x..x.....'); r.hits('snare', b, '..x..x......'); r.note('crash', b, 6, 1, 60, 1.0)
            r.hits('dkick', b, '......xoxoxo', v=0.85, len=0.09)
        else:
            riff(r, b, gallop(g) if b % 2 == 0 else run(g))
            skank(r, b, sym, 1.0); held(r, 'choir', b, sym, 0.8 if not second else 0.95, lo=55, hi=68)
            r.hits('dkick', b, 'xoxoxoxoxoxo', v=0.85, len=0.09); r.hits('kick', b, 'x.....x.....')
            r.hits('snare', b, '...x.....x..'); r.hits('china', b, 'x..x..x..x..', v=0.6)
        r.line('lead', b, tune, 1.0); r.line('harpsi', b, tune, 0.9, octave=-1); r.line('bones', b, tune, 0.7)
        if second: r.line('lead', b, third(tune, 'D'), 0.42)
    for b in (0, 8): r.note('crash', b, 0, 1, 60, 1.0); r.note('fx', b, 0, 1, 60, 0.2, s='boom'); pipe(r, b, 'Dm', 0.9, dur=5.5)
    for b in (4, 12): r.note('crash', b, 0, 1, 60, 0.7)
    fill(r, 7)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    s.start = 'intro'
    return s
