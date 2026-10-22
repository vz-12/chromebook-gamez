"""ragequit: THE RAGE QUIT, THE YARD's boss (MUSIC-PLAN.md). The sore loser: he closes the tab before a run
can end on him, blames the lag, and every stone in the yard is one of his runs. His song is THE YARD's
tune twice as fast, and like every run of his it is never allowed to end: each time it comes round to its
last bar he stops the tape, spins it back and starts again. Only in his last quarter, with every run he
left standing in a doorway, does it play to the end: he loses for the first time.

Breakcore and metal: an amen break cut into sixteenths over a kick and a snare, guitars, a wall of saws
for his voice with a square wave over it (it is a game), a controller's buttons mashed where the hats
would be. 180 BPM, C minor.

  intro  4 bars, once  the tape starting; a button; the tune's first notes as a game's title jingle; the break
  p1     16 bars       the tune at full speed, twice; at its last bar the tape is stopped and spun back
  p2     16 bars       its second strain, twice, over both feet, and it lags: bars stutter where he blames it
  p3     16 bars       the tilt: both strains at twice the speed again, two bars of them to a bar, and
                       spun back every four; second time the square wave a third over the saws
  p4     16 bars       his last quarter: half time, THE YARD's own speed, its organ, its choir and its bell
                       standing in the doors; the tune plays to its end, and its last bar lands
  again  2 bars        he got through a gate: THAT ONE DIDN'T COUNT. The whole song rewinds, the tape starts
                       again, and the quarter's music starts over from its top (the game cuts to it at once)

His quarters are the phases (p1 to p4), not his health: a quarter only ends when he is stopped short of a
gate, and getting through one puts the quarter back to its start, so its music starts over too.
"""
import numpy as np
from daw import SR, Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, shift
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, organ, backwards
from scores._common import kit, hallows, yard, void, riff, gallop, trem, third, slow, legato, pipes, tomfill
from scores.yard import THEME, THEME_CH, EPITAPH, EPITAPH_CH, ROOT, GTR, DOOM

TITLE = 'Run It Back'
ORDER = ['intro', 'p1', 'p2', 'again', 'p3', 'p4']

# the amen, as it was played: its first bar's sixteenths, then its second's
AMEN = [list(range(16)), list(range(16, 32))]

def song():
    K = kit(); H = hallows(); Y = yard(); V = void()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 180
    s = Song('ragequit', 180, target=-10.0, ceil=-2.0, room=dict(decay=1.8, pre=0.015, bright=6500.0, dark=1500.0),
             echo=dict(time=beat * 0.75, fb=0.32, taps=4), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.58, key=True, fx=[lambda x: clip(x, 0.7)]))      # its thud moved from E onto E flat
    s.add('dkick', Bus(hit(K['kick_m'], tune=-1.0), gain=0.5, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.6, rev=0.14, fx=[lambda x: clip(x, 0.65)]))               # it rings on G: the fifth here
    amen = {f'a{k}': x for k, x in enumerate(Y['amen'])}; amen.update({f'x{k}': x for k, x in enumerate(Y['amenx'])})
    s.add('brk', Bus(clips(amen), gain=0.5, rev=0.06, duck=0.15, fx=[lambda x: clip(hp(x, 140.0), 0.6)]))   # the break, over the kit's own kick
    s.add('mash', Bus(hit(Y['mash'], human=0.003), gain=0.7, fx=[lambda x: clip(hp(x, 800.0), 0.4)]))       # his thumbs, where the hats would be
    s.add('click', Bus(hit(Y['click']), gain=0.8, rev=0.1, fx=[lambda x: hp(x, 300.0)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.7, fx=[lambda x: clip(hp(x, 500.0), 0.35)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.32, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.26, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.55, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.3, rev=0.06, duck=0.2, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('doom', Bus(sampler(Y['doom'], rel=0.3), gain=0.3, rev=0.1, duck=0.2, fx=[lambda x: clip(hp(x, 60.0), 0.85)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.1, spread=0.0, sub=0.5, sq=0.4, cutoff=520.0, env=2.6, fdecay=0.09, res=1.1,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.04, dirt=0.85),
                      gain=0.34, duck=0.45, fx=[lambda x: clip(peak(hp(x, 40.0), 750.0, 2.5, 1.0), 0.75)]))
    # his voice: a wall of saws; and over it the game's own, a square wave
    s.add('saws', Bus(synth('saw', voices=7, detune=0.3, spread=1.0, cutoff=5200.0, env=0.6, fdecay=0.3, res=0.9, a=0.004, d=0.2, s=0.85,
                            r=0.1, glide=0.05, vib=0.08, vibat=0.3),
                      gain=0.32, dly=0.15, rev=0.22, duck=0.22, fx=[lambda x: hp(x, 250.0)]))
    s.add('pulse', Bus(synth('square', pw=0.25, cutoff=9000.0, track=0.3, a=0.002, d=0.06, s=0.85, r=0.03, vib=0.12, vibat=0.2),
                       gain=0.2, dly=0.25, rev=0.14, fx=[lambda x: hp(x, 300.0)]))
    # the tape going back: the tune's notes, backwards, too fast to count
    s.add('rew', Bus(backwards(synth('square', pw=0.3, cutoff=6000.0, track=0.3, a=0.002, d=0.04, s=0.8, r=0.02)),
                     gain=0.16, rev=0.15, fx=[lambda x: hp(x, 350.0)]))
    # the yard, standing in the doors
    s.add('organ', Bus(organ(trem=0.0), gain=0.4, rev=0.36, duck=0.12, fx=[lambda x: clip(hp(x, 110.0), 0.6)]))
    s.add('pipes', Bus(pipes(), gain=0.5, rev=0.38, duck=0.15, fx=[lambda x: hp(x, 90.0)]))
    s.add('choir', Bus(sampler(H['choir'], rel=0.6), gain=0.28, rev=0.55, duck=0.2, fx=[lambda x: hp(x, 170.0)]))
    s.add('bell', Bus(sampler(Y['bell'], rel=2.5), gain=0.5, rev=0.4, fx=[lambda x: hp(x, 120.0)]))
    s.add('bigbell', Bus(sampler(Y['bigbell'], rel=2.0), gain=0.45, rev=0.4, fx=[lambda x: hp(x, 70.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.2), 'riser': riser(2 * s.bar, lo=300.0, hi=9000.0), 'rev': reverse(K['crash'], 1.4),
                           'spin0': Y['spin'][0], 'spin1': Y['spin'][1], 'rewind': Y['rewind'], 'tstart': Y['tstart'],
                           'tstop': Y['tstop'], 'plug': Y['plug'], 'glitch0': Y['glitch'][0], 'glitch1': Y['glitch'][1],
                           'static': Y['static'], 'risen': V['swell'], 'thunder': H['thunder']}),
                    gain=1.0, rev=0.2, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def held(sec, bus, bar, sym, v=1.0, lo=50, hi=65, at=0, dur=15.5):
        for m in chord(sym, 3):
            while m < lo: m += 12
            while m > hi: m -= 12
            sec.note(bus, bar, at, dur, m, v)
    def pipe(sec, bar, sym, v=0.8, at=0, dur=15.5):
        sec.note('pipes', bar, at, dur, root(sym) + 12, v, kind='minor' if sym.endswith('m') else 'fifth')
    def chop(sec, bar, order, kind='a', v=1.0, at=0, every=1.0):
        """The break, cut and laid out again: one slice per sixteenth (or per `every`), '.' for none."""
        for i, k in enumerate(order):
            if k is not None and k != '.': sec.note('brk', bar, at + i * every, every, 60, v, s=f'{kind}{k}')
    def kit_bar(sec, bar, v=1.0, both=False, fill=False):
        sec.hits('kick', bar, 'x.....x...x.....', v=v)
        sec.hits('snare', bar, '....x.......x...' if not fill else '....x.....x.xxxx', v=v)
        if both: sec.hits('dkick', bar, 'xoxoxoxoxoxoxoxo', v=0.75 * v, len=0.08)
    def thumbs(sec, bar, pat='x.x.x.x.x.x.x.x.', v=0.8):
        sec.hits('mash', bar, pat, v=v)
    def restart(sec, bar, sym_last='G', at=0):
        """Where the last bar should be: the home chord for an eighth, the tape stopped under it, the tape
        spun back (and the tune's notes with it, backwards), and a snare to count it in again. From `at`
        (a half bar's version at 8)."""
        h = 16 - at
        sec.note('click', bar, at, 1, 60, 1.0)
        sec.note('kick', bar, at, 1, 60, 1.0); sec.note('crash', bar, at, 1, 60, 0.6)
        sec.note('gtr', bar, at, 2, midi('C2'), 1.0, kind='chord'); sec.note('bass', bar, at, 1.8, midi('C2'), 1.0)
        sec.note('fx', bar, at, 1, 60, 0.55, s='tstop')
        sec.note('fx', bar, at + h * 0.3, 1, 60, 0.7, s='spin1' if at == 0 else 'spin0', len=h * 0.55 * s.step + 0.05)
        notes = [midi(t.partition(':')[0]) for t in ' '.join(THEME[:7]).split()][::-1]
        n = int(h * 0.55 * 2)
        for k in range(n):
            sec.note('rew', bar, at + h * 0.3 + k * 0.5, 0.5, notes[k % len(notes)] + k * 0.6, 0.9)
        sec.hits('snare', bar, '............xxxx', v=0.8)
    def lag(sec, bar, at, slices=(0,), kind='a', v=1.0):
        """It lags: a quarter of a bar caught and played over and over, faster each time, and a glitch."""
        for k in range(8):
            sec.note('brk', bar, at + k * 0.5, 0.5, 60, v * (1.0 - 0.05 * k), s=f'{kind}{slices[k % len(slices)]}')
        sec.note('fx', bar, at, 1, 60, 0.4, s='glitch0')
        sec.note('gtr', bar, at, 0.5, 36, 0.8, kind='chug'); sec.note('gtr', bar, at + 1, 0.5, 36, 0.8, kind='chug')

    # ---- intro: the tape starting; a button; the tune's first notes as a game's title jingle; the break
    i = s.section('intro', 4, seg=4, loop=False, next='p1', lock=True)
    i.note('fx', 0, 0, 1, 60, 0.5, s='tstart'); i.note('click', 0, 8, 1, 60, 1.0); i.note('fx', 0, 12, 1, 60, 0.25, s='static')
    i.line('pulse', 1, THEME[0], 0.9); i.line('pulse', 2, 'F5:4 Eb5:4 D5:4 B4:4', 0.9)
    thumbs(i, 1, '..x...x.x...x.x.', 0.6)
    chop(i, 2, AMEN[0], v=0.9); chop(i, 3, AMEN[1], v=0.95)
    for b in (2, 3):
        for k in range(8): i.note('bass', b, k * 2, 1.6, 36, 0.6 + 0.05 * b)
    pipe(i, 2, 'G', 0.4, dur=31.5)
    i.hits('snare', 3, '........x.x.xxxx', v=0.8); i.note('fx', 3, 12, 1, 60, 0.35, s='glitch1')
    i.note('fx', 2, 0, 32, 60, 0.16, s='riser'); i.note('fx', 3, 15.99, 1, 60, 0.22, s='rev', lead=1.4 - 0.01 * s.step)

    # ---- p1: the tune at full speed, twice, and never let it end
    p = s.section('p1', 16, seg=2)
    for b in range(16):
        k = b % 8; sym = THEME_CH[k]; second = b >= 8
        if k == 7: restart(p, b); continue
        g = GTR[sym]
        gallop(p, b, g)
        kit_bar(p, b, fill=(k == 6))
        chop(p, b, AMEN[k % 2], kind='x' if second else 'a', v=0.75)
        p.line('saws', b, THEME[k], 1.0)
        if second: p.line('pulse', b, THEME[k], 0.8, octave=1); thumbs(p, b)
        else: p.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.8)
        if k in (0, 4): p.note('crash', b, 0, 1, 60, 0.9)
    p.note('fx', 0, 0, 1, 60, 0.18, s='boom'); p.note('fx', 8, 0, 1, 60, 0.18, s='boom')
    p.note('fx', 5, 0, 32, 60, 0.12, s='riser'); p.note('fx', 13, 0, 32, 60, 0.12, s='riser')

    # ---- p2: its second strain, both feet, and it lags
    q = s.section('p2', 16, seg=2)
    for b in range(16):
        k = b % 8; sym = EPITAPH_CH[k]; second = b >= 8
        if k == 7: restart(q, b); continue
        g = GTR[sym]
        if k in (1, 4):
            riff(q, b, f'{g}*:4 {g}:1 {g}:1 {g}:1 {g}:1 {g}*:4 r:4')
            kit_bar(q, b, both=True); chop(q, b, AMEN[k % 2][:12], kind='x', v=0.75)
            lag(q, b, 12, slices=(12,) if k == 1 else (4, 4, 5, 5), kind='x')
        else:
            trem(q, b, g); kit_bar(q, b, both=True, fill=(k == 6)); chop(q, b, AMEN[k % 2], kind='x', v=0.75)
        q.line('saws', b, EPITAPH[k], 1.0)
        q.line('pulse', b, third(EPITAPH[k], 'C'), 0.6 if not second else 0.75)
        thumbs(q, b, 'xxxxxxxxxxxxxxxx' if second else 'x.x.x.x.x.x.x.x.', 0.65)
        q.note('doom', b, 0, 15.5, midi(DOOM[sym]), 0.7)
        if k in (0, 4): q.note('crash', b, 0, 1, 60, 0.9)
    q.note('fx', 0, 0, 1, 60, 0.2, s='boom'); q.note('fx', 8, 0, 1, 60, 0.2, s='boom')
    q.note('fx', 5, 0, 32, 60, 0.12, s='riser'); q.note('fx', 13, 0, 32, 60, 0.12, s='riser')

    # ---- p3: the tilt. Both strains twice as fast again, two of their bars to a bar, spun back every four
    r = s.section('p3', 16, seg=2)
    fastT = [slow(t, 0.5) for t in THEME]; fastE = [slow(t, 0.5) for t in EPITAPH]
    for b in range(16):
        u = b % 8; second = b >= 8
        tune, chs = (fastT, THEME_CH) if u < 4 else (fastE, EPITAPH_CH)
        k0 = (u % 4) * 2                                   # the tune's two bars in this one
        quits = k0 + 1 == 7                                # its second half is where the last bar would be
        for h in range(1 if quits else 2):
            sym = chs[k0 + h]; g = midi(GTR[sym]); at = h * 8
            for n in range(8): r.note('gtr', b, at + n, 1, g, 1.0 if n % 4 == 0 else 0.85, kind='chord' if n % 4 == 0 else 'chug')
            for n in range(4): r.note('bass', b, at + n * 2, 1.8, g - 12 if g > midi('E2') else g, 0.9)
            pipe(r, b, sym, 0.55, at=at, dur=7.5)
        if quits: restart(r, b, at=8)
        text = tune[k0] + ('' if quits else ' ' + tune[k0 + 1])
        r.line('saws', b, text, 1.0)
        r.line('pulse', b, third(text, 'C') if second else text, 0.75 if second else 0.6, octave=1)   # the game: with him, then a third over him
        r.hits('kick', b, 'x...x...x...x...' if not quits else 'x...x...........', v=0.95)
        r.hits('dkick', b, 'xxxxxxxxxxxxxxxx' if second and not quits else 'xoxoxoxo........' if quits else 'xoxoxoxoxoxoxoxo', v=0.75, len=0.07)
        r.hits('snare', b, '..x...x...x...x.' if not quits else '..x...x.........', v=0.9)
        chop(r, b, ([3, 3, 6, 7, 4, 4, 10, 11] if second else AMEN[b % 2][:8]) + (['.'] * 8 if quits else [12, 13, 14, 15, 4, 5, 6, 7]),
             kind='x' if second else 'a', v=0.7)
        thumbs(r, b, 'xxxxxxxx........' if quits else 'xxxxxxxxxxxxxxxx', 0.7)
        if u in (0, 4): r.note('crash', b, 0, 1, 60, 1.0); r.note('china', b, 8, 1, 60, 0.6)
    r.note('fx', 0, 0, 1, 60, 0.2, s='boom'); r.note('fx', 8, 0, 1, 60, 0.22, s='boom'); r.note('fx', 8, 0, 1, 60, 0.4, s='glitch1')
    r.note('fx', 6, 0, 32, 60, 0.12, s='riser'); r.note('fx', 14, 0, 32, 60, 0.14, s='riser')

    # ---- p4: his last quarter. THE YARD's speed, its voices in the doors, and the tune gets to its end
    w = s.section('p4', 16, seg=2)
    prev = None
    for k in range(8):
        sym = THEME_CH[k]; b = k * 2; g = GTR[sym]; last = k == 7
        tune = slow(THEME[k], 2)                             # one bar of the yard's is two of his
        w.line('organ', b, tune, 1.0); w.line('saws', b, tune, 0.85)
        held(w, 'choir', b, sym, 0.95, lo=55, hi=68, dur=31.5); pipe(w, b, sym, 0.85, dur=31.5)
        w.note('doom', b, 0, 31.5, midi(DOOM[sym]), 0.9)
        for h in range(2):
            bb = b + h
            if last:
                w.hits('kick', bb, 'x...............' if h == 0 else 'x...x...x...xxxx', v=1.0)
                w.hits('snare', bb, '................' if h == 0 else '........x.x.xxxx', v=0.85)
                riff(w, bb, 'C2*:16' if h == 0 else 'C2*:8 C2:2 C2:2 C2:2 C2:2')
                continue
            riff(w, bb, f'{g}*:6 {g}:2 {g}*:4 {g}:2 {g}:2' if h == 0 else f'{g}*:4 {g}:2 {g}:2 {g}:1 {g}:1 {g}:1 {g}:1 {g}*:4')
            w.hits('kick', bb, 'x.....x.........' if h == 0 else 'x.....x...x.....')
            w.hits('snare', bb, '........x.......' if not (k == 6 and h == 1) else '........x...xxxx')
            w.hits('dkick', bb, 'x.x.x.x.x.x.x.x.', v=0.7, len=0.1)
            w.hits('china', bb, 'x...x...x...x...', v=0.5)
        if k in (0, 4): w.note('crash', b, 0, 1, 60, 1.0); w.note('bigbell', b, 0, 40, midi('Eb3'), 0.55)
    # the end, at last: the bell where the yard has a stone, and everything on the home chord
    w.note('bell', 14, 0, 40, 72, 1.0); w.note('crash', 14, 0, 1, 60, 1.0); w.note('fx', 14, 0, 1, 60, 0.25, s='boom')
    w.note('fx', 0, 0, 1, 60, 0.3, s='risen'); w.note('fx', 8, 0, 1, 60, 0.3, s='risen')
    w.note('fx', 12, 0, 32, 60, 0.14, s='riser')

    # ---- again: THAT ONE DIDN'T COUNT. Everything rewinds, and the tape starts again
    g = s.section('again', 2, seg=2, loop=False, next='p1', lock=True, cut=True, level=-1.0)
    g.note('fx', 0, 0, 1, 60, 0.75, s='rewind', len=1.4); g.note('fx', 0, 0, 1, 60, 0.6, s='spin1')
    g.note('click', 0, 0, 1, 60, 1.0); g.note('fx', 0, 0, 1, 60, 0.4, s='glitch1')
    notes = [midi(t.partition(':')[0]) for t in ' '.join(THEME[:7] + EPITAPH[:7]).split()][::-1]
    for k in range(28): g.note('rew', 0, k * 0.5, 0.5, notes[k % len(notes)] + 3 + k * 0.4, 0.9)
    chop(g, 0, list(range(31, -1, -1)), kind='x', v=0.55, every=0.5)
    g.note('fx', 1, 0, 1, 60, 0.6, s='tstart', len=1.3); g.note('click', 1, 0, 1, 60, 1.0)
    for k in range(8): g.note('bass', 1, k * 2, 1.6, 36, 0.4 + 0.07 * k)
    g.hits('snare', 1, 'x.......x.x.xxxx', v=0.85); g.hits('kick', 1, 'x.......x.......', v=0.9)
    g.line('pulse', 1, 'C5:2 G5:2 Ab5:3 G5:1 r:8', 0.9)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3', 'p4': 'p4', 'again': 'again'}
    s.start = 'intro'
    return s
