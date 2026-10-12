"""null: NULL, THE VOID's boss and the end of act one (MUSIC-PLAN.md). "Borrows every earlier trick,
then some", so its music does: the main theme, moved up into C minor, at half speed and then at full;
the four sectors' tunes, four bars each, on their own instruments; and THE VOID's tune sung under the
theme's answer, which was written over the same chords. 150 BPM, C minor.

  intro  4 bars, once   the statement, with no drums: the bass climbs a step a bar under brass and a
                        choir, every chord sliding into the next, the lead climbing over it; a roll, and
  p1     16 bars        the sweep: the theme at half speed, long notes over a pulse and guitars
  p2     20 bars        it stops the room: four bars with the drums gone and the stars out. Then every
                        earlier trick over double kicks: THE FOUNDRY's tune on its whistle with the
                        anvils, THE HIVE's long brood line with the legs under it, THE VAULT's on
                        glass with the ticking, THE ARCHIVIST's subject at half speed with the
                        harpsichord and the typewriter. The two long ones are sung by this track's
                        own lead and strings over its own pulse, the sector's instrument beside them:
                        the fast versions of those two tunes (a crawl by semitones, a baroque run)
                        turned up and down in a way nothing else here does, and stuck out
  p3     24 bars        the theme at speed in octaves; its answer, with horns singing THE VOID's tune
                        against it; a run down through four chords; then four bars held on C with the
                        drums thinned out, and round again

Reference: Galactic Destruction (a statement at full power before any drums, the rising bass and the
slides, a quiet stretch with no drums in the middle, a peak that walks down four chords under fast runs,
and a thinned-out break on the home note before the loop).
"""
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip, gate, shift
from inst import hit, synth, keys, guitar, amp, sampler, skitter, clips, riser, reverse, boom
from scores._common import (THEME, ANSWER, third, kit, forge, vault, void, tomfill, gallop, trem, hammer,
                            move, slow, sing, legato)
from scores.foundry import TUNE
from scores.hive import BROOD
from scores.vault import DIAL
from scores.archivist import LONG
from scores.void import RISE

TITLE = 'The Schedule Says It Is Time'
ORDER = ['intro', 'p1', 'p2', 'p3', 'p3']

# the main theme and its answer, a minor third higher: in C minor
TH = [move(t, 3) for t in THEME]
TH_CH = ['Cm', 'Cm', 'Bb', 'Eb', 'Cm', 'Cm', 'Ab', 'Bb']
AN = [move(t, 3) for t in ANSWER]
AN_CH = ['Ab', 'Bb', 'Cm', 'Cm', 'Ab', 'Bb', 'G', 'G']
# the statement: the bass a step higher every bar, the lead climbing each chord
STATE = [('Cm', 'C2', 'C5:4 Eb5:4 G5:8'), ('Bb', 'D2', 'F5:4 G5:4 Bb5:8'), ('Eb', 'Eb2', 'G5:4 Bb5:4 Eb6:8'), ('Fm', 'F2', 'F6:4 Eb6:4 D6:8')]
# every earlier trick: whose, four bars of it in C minor, and its chords
QUOTE = [('foundry', [move(t, -2) for t in TUNE[:4]], ['Cm', 'Cm', 'Eb', 'Bb']),
         ('hive', [move(t, 6) for t in BROOD[:4]], ['Cm', 'Ab', 'Fm', 'G']),
         ('vault', [move(t, 1) for t in DIAL[:4]], ['Cm', 'Cm', 'Ab', 'Ab']),
         ('archivist', [move(t, 1) for t in LONG[3:7]], ['Eb', 'Ab', 'Ddim', 'G'])]
# the run: each chord broken downward in sixteenths under a top note that climbs; then up the dominant and off it
RUN = ['C6:1 G5:1 Eb5:1 C5:1 D6:1 G5:1 Eb5:1 C5:1 Eb6:1 G5:1 Eb5:1 C5:1 G6:1 G5:1 Eb5:1 C5:1',
       'Bb5:1 F5:1 D5:1 Bb4:1 D6:1 F5:1 D5:1 Bb4:1 F6:1 F5:1 D5:1 Bb4:1 D6:1 F5:1 D5:1 Bb4:1',
       'C6:1 Eb5:1 C5:1 Ab4:1 Eb6:1 Eb5:1 C5:1 Ab4:1 Ab6:1 Eb5:1 C5:1 Ab4:1 Eb6:1 Eb5:1 C5:1 Ab4:1',
       'G4:1 B4:1 D5:1 G5:1 B5:1 D6:1 G6:2 F6:2 D6:2 B5:2 G5:2']
RUN_CH = ['Cm', 'Bb', 'Ab', 'G']
LOW = {'Cm': 'C2', 'Bb': 'Bb1', 'Eb': 'Eb2', 'Ab': 'Ab1', 'G': 'G1', 'Fm': 'F1', 'Db': 'Db2', 'Ddim': 'D2'}
VOICE = {'Cm': 'C3 G3 C4 Eb4 G4', 'Ab': 'Ab2 Eb3 Ab3 C4 Eb4', 'Bb': 'Bb2 F3 Bb3 D4 F4', 'Fm': 'F2 C3 F3 Ab3 C4',
         'Eb': 'Eb3 Bb3 Eb4 G4 Bb4', 'G': 'G2 D3 G3 B3 D4', 'Db': 'Db3 Ab3 Db4 F4 Ab4', 'Ddim': 'D3 Ab3 D4 F4 Ab4'}
OST = 'x.xx.xx.x.xx.xx.'
ACC = (0, 3, 6, 8, 11, 14)

def song():
    K = kit(); V = void(); F = forge(); T = vault()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}      # the F recording is F major: no use in C minor
    s = Song('null', 150, target=-10.0, ceil=-2.0, room=dict(decay=2.2, pre=0.015, bright=6500.0, dark=1600.0),
             master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.95, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('dkick', Bus(hit(K['kick_m']), gain=0.7, fx=[lambda x: clip(x, 0.7)]))            # the second foot: it does not duck the rest
    s.add('snare', Bus(hit(K['snare_m']), gain=0.78, rev=0.14, fx=[lambda x: clip(x, 0.55)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.6, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.4, rev=0.2, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.3, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.18, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.5), gain=0.55, rev=0.25, fx=[lambda x: clip(x, 0.6)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.7), gain=0.4, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75, glide=0.08),
                      gain=0.36, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('stack', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, sq=0.15, cutoff=1900.0, env=1.3, fdecay=0.5, res=0.8, track=0.3,
                             a=0.03, d=0.5, s=0.85, r=0.3, dirt=0.25, glide=0.1),
                       gain=0.13, rev=0.3, duck=0.3, fx=[lambda x: hp(x, 160.0)]))
    s.add('horn', Bus(sampler(V['horn'], rel=0.2), gain=0.55, rev=0.3, duck=0.15, fx=[lambda x: clip(hp(x, 90.0), 0.7)]))
    s.add('stab', Bus(sampler(V['stab'], rel=0.06), gain=0.9, rev=0.25, fx=[lambda x: hp(x, 120.0)]))
    s.add('brass', Bus(synth('saw', voices=3, detune=0.08, spread=0.4, cutoff=1300.0, env=1.8, fdecay=0.3, res=0.8, track=0.4,
                             a=0.04, d=0.3, s=0.85, r=0.2, vib=0.08, dirt=0.3, glide=0.07),
                       gain=0.2, rev=0.35, duck=0.1, fx=[lambda x: peak(hp(x, 200.0), 900.0, 2.0, 1.0)]))
    s.add('choir', Bus(sampler(V['choir'], rel=0.5), gain=0.26, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('lead', Bus(synth('saw', voices=4, detune=0.12, spread=0.6, sq=0.25, cutoff=3200.0, env=0.9, fdecay=0.25, res=1.0,
                            a=0.012, d=0.2, s=0.9, r=0.15, vib=0.16, vibat=0.28, glide=0.055, dirt=0.3),
                      gain=0.24, dly=0.22, rev=0.28, duck=0.08, fx=[lambda x: peak(hp(x, 250.0), 2000.0, 1.5, 1.0)]))
    s.add('strings', Bus(sampler(V['strings'], rel=0.2), gain=0.55, rev=0.35, fx=[lambda x: hp(x, 250.0)]))
    s.add('pulse', Bus(synth('square', pw=0.25, voices=2, detune=0.07, spread=0.7, cutoff=2400.0, env=1.0, fdecay=0.07, a=0.002,
                             d=0.1, s=0.3, r=0.05), gain=0.42, dly=0.22, rev=0.18, duck=0.2, fx=[lambda x: hp(x, 350.0)]))
    s.add('star', Bus(keys(ratio=4.0, index=1.2, decay=1.2, spread=0.8), gain=0.25, dly=0.5, rev=0.5, fx=[lambda x: hp(x, 500.0)]))
    s.add('piano', Bus(sampler(V['piano'], rel=0.6), gain=0.6, rev=0.4, dly=0.2, fx=[lambda x: hp(x, 120.0)]))
    s.add('plow', Bus(sampler(V['plow'], rel=1.0), gain=0.55, rev=0.3,
                      fx=[lambda x: peak(peak(hp(x, 40.0), 163.5, -14.0, 9.0), 327.0, -14.0, 9.0)]))
    # the borrowed voices: each sector's tune comes with the instrument that played it there
    s.add('whistle', Bus(synth('square', pw=0.3, voices=2, detune=0.1, spread=0.35, cutoff=2600.0, env=1.4, fdecay=0.16, res=1.4,
                               a=0.004, d=0.14, s=0.7, r=0.09, vib=0.08, dirt=0.4), gain=0.22, dly=0.2, rev=0.2, fx=[lambda x: hp(x, 250.0)]))
    s.add('anvil', Bus(hit(F['anvil'], human=0.002, tune=-2.0), gain=0.85, rev=0.3, fx=[lambda x: clip(hp(x, 250.0), 0.8)]))     # its ring moved from D to C
    s.add('buzz', Bus(synth('saw', voices=2, detune=0.1, spread=0.35, sq=0.4, cutoff=2600.0, env=1.2, fdecay=0.2, res=1.4, a=0.005,
                            d=0.16, s=0.8, r=0.1, vib=0.1, dirt=0.35, buzz=0.5, buzzhz=92.0, glide=0.09),
                      gain=0.34, dly=0.2, rev=0.2, fx=[lambda x: hp(x, 250.0)]))
    s.add('legs', Bus(skitter(tone=3800.0), gain=1.4, rev=0.18, dly=0.1, fx=[lambda x: clip(x, 0.5)]))
    s.add('glass', Bus(keys(ratio=3.5, index=1.4, decay=1.5, spread=0.5), gain=0.26, dly=0.3, rev=0.45, fx=[lambda x: hp(x, 300.0)]))
    s.add('tick', Bus(hit(T['tick'], human=0.0015), gain=0.9, rev=0.1, fx=[lambda x: clip(hp(x, 1500.0), 0.6)]))
    s.add('harpsi', Bus(sampler(T['harpsi'], rel=0.1), gain=0.5, rev=0.16, dly=0.08, fx=[lambda x: hp(x, 180.0)]))
    s.add('quill', Bus(synth('square', pw=0.12, cutoff=5200.0, env=0.6, fdecay=0.05, res=0.8, track=0.5, a=0.001, d=0.3, s=0.0, r=0.08),
                       gain=0.34, rev=0.16, dly=0.08, fx=[lambda x: hp(x, 400.0)]))
    s.add('keys', Bus(hit(T['keys'], human=0.002), gain=0.8, rev=0.08, fx=[lambda x: clip(hp(x, 900.0), 0.6)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.6), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'short': riser(s.bar, lo=600.0),
                           'rev': reverse(K['crash'], 1.6), 'rroll': reverse(V['roll'], 2.2), 'roll': V['roll'], 'swell': V['swell'],
                           'whoosh': V['whoosh'], 'tinkle': V['tinkle'], 'ice': V['ice'], 'shatter': V['shatter'],
                           'clang': shift(F['clang'][0], -2.0), 'bell': shift(T['bell'], 1.0), 'book': gate(T['book'], 0.6, 0.2)}),
                    gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(LOW[sym])
    def groot(sym): return LOW['Bb' if sym == 'Ddim' else sym]      # under the diminished chord the guitars play B flat: together, a seventh
    def near(sym, centre):
        """The chord's root in the octave nearest a recording's own note."""
        p = root(sym) % 12 + 36
        while p - centre > 5: p -= 12
        while centre - p > 6: p += 12
        return p
    def tp(sym): return root(sym) % 12 + 36
    def bed(sec, bar, sym, v=1.0, bars=1):
        for m in chord(sym, 3):
            while m < 55: m += 12
            while m > 68: m -= 12
            sec.note('choir', bar, 0, 16 * bars - 0.5, m, v)
    def stack(sec, bar, sym, frm=None, v=1.0, dur=15.5, at=0):
        cur = [midi(n) for n in VOICE[sym].split()]; old = [midi(n) for n in VOICE[frm].split()] if frm else cur
        for p, q in zip(cur, old): sec.note('stack', bar, at, dur, p, v, **({'slide': q - p} if q != p else {}))
    def brass(sec, bar, sym, at=(0,), v=1.0, dur=6):
        """Horns on the root, the fifth under it, and a trombone's plod below."""
        for st_ in at:
            sec.note('horn', bar, st_, dur, near(sym, 45.0), v); sec.note('horn', bar, st_, dur, near(sym, 45.0) - 5, v * 0.6)
            sec.note('stab', bar, st_, 1.8, near(sym, 47.0), v * 0.8)
    def low(sec, bar, sym, frm, mode='eighths', v=1.0):
        """The bass, sliding into the bar from the root before it."""
        r = root(sym); old = root(frm) if frm else r
        sl = {'slide': old - r} if old != r else {}
        if mode == 'long': sec.note('bass', bar, 0, 15, r, v * 0.8, **sl)
        else:
            for n in range(8): sec.note('bass', bar, n * 2, 1.7, r + (12 if n in (3, 7) else 0), v * (1.0 if n % 2 == 0 else 0.82), **(sl if n == 0 else {}))
    def ost(sec, bar, sym, v=0.8, pattern=OST):
        tones = chord(sym, 4); order = [0, 2, 1, 2, 0, 2, 1, 2, 0, 2]; k = 0
        for n, ch in enumerate(pattern):
            if ch == 'x': sec.note('pulse', bar, n, 0.9, tones[order[k % len(order)]], v * (1.0 if n % 4 == 0 else 0.8)); k += 1
    def stars(sec, bar, sym, at=(2, 7, 11, 14), v=0.7):
        tones = [m + 24 for m in chord(sym, 4)] + [m + 36 for m in chord(sym, 4)][:2]
        for n, st_ in enumerate(at): sec.note('star', bar, st_, 2, tones[(n * 2 + bar) % len(tones)], v * (0.7 + 0.3 * ((n + bar) % 2)))
    def feet(sec, bar, v=0.85):
        """Both feet: sixteenths, each cut short so they stay apart."""
        sec.hits('dkick', bar, 'xoxoxoxoxoxoxoxo', v=v, len=0.1)
    def roll(sec, bar, at=0, n=16, lo=0.35, hi=0.95, width=1.0):
        for k in range(n): sec.note('snare', bar, at + k * width, width, 60, lo + (hi - lo) * k / max(1, n - 1))

    # ---- intro: the statement. No drums: brass, a choir, the bass climbing a step a bar
    i = s.section('intro', 4, seg=2, loop=False, next='p1', lock=True)
    for b, (sym, bassn, text) in enumerate(STATE):
        frm = STATE[b - 1][0] if b else None
        stack(i, b, sym, frm, 1.0, dur=15.5 if b < 3 else 7.5); bed(i, b, sym, 0.9 + 0.05 * b)
        old = midi(STATE[b - 1][1]) if b else midi(bassn)
        i.note('bass', b, 0, 15.5 if b < 3 else 7.5, midi(bassn), 0.9, **({'slide': old - midi(bassn)} if b else {}))
        brass(i, b, sym, (0,), 0.9 + 0.04 * b, dur=10)
        i.note('timp', b, 0, 8, midi(bassn) % 12 + 36, 0.85 + 0.05 * b)
        legato(i, 'lead', b, text, 1.0); sing(i, 'strings', b, text, 0.85)
        if b >= 2: i.line('lead', b, third(text, 'C'), 0.5, octave=-1)
    # the fourth bar turns to the dominant halfway through
    stack(i, 3, 'G', 'Fm', 1.0, dur=7.5, at=8); i.note('bass', 3, 8, 7.5, midi('G2'), 0.9, slide=-2.0)
    brass(i, 3, 'G', (8,), 1.0, dur=7); i.note('timp', 3, 8, 6, 43, 0.95)
    i.note('plow', 0, 0, 30, 24, 0.9); i.note('plow', 0, 0, 30, 36, 0.7)
    i.note('crash', 0, 0, 1, 60, 0.9); i.note('crash', 2, 0, 1, 60, 0.7)
    i.note('fx', 0, 0, 1, 60, 0.22, s='boom'); i.note('fx', 0, 0, 1, 60, 0.3, s='whoosh'); i.note('fx', 2, 0, 1, 60, 0.18, s='boom')
    roll(i, 3, 0, 16, 0.3, 0.95); tomfill(i, 3, 12)
    i.note('fx', 3, 0, 16, 60, 0.28, s='short')
    i.note('fx', 3, 15.99, 1, 60, 0.32, s='rev', lead=1.6 - 0.01 * s.step); i.note('fx', 3, 15.99, 1, 60, 0.3, s='rroll', lead=2.2 - 0.01 * s.step)

    # ---- p1: the sweep. The theme at half speed over a pulse and guitars
    a = s.section('p1', 16, seg=2)
    for k in range(8):
        sym = TH_CH[k]; frm = TH_CH[k - 1]; b = k * 2
        legato(a, 'lead', b, slow(TH[k]), 1.0); sing(a, 'strings', b, slow(TH[k]), 0.85)
        if k >= 4: a.line('lead', b, third(slow(TH[k]), 'C'), 0.5, octave=-1)
        brass(a, b, sym, (0,), 0.9); a.note('timp', b, 0, 6, tp(sym), 0.85)
        for h in (0, 1):
            bb = b + h; g = groot(sym)
            stack(a, bb, sym, frm if h == 0 else sym, 0.9); bed(a, bb, sym, 0.9); ost(a, bb, sym, 0.85)
            low(a, bb, sym, frm if h == 0 else sym)
            for n, (st_, d, ring) in enumerate([(0, 3, 1), (3, 1, 0), (4, 2, 0), (6, 2, 0), (8, 3, 1), (11, 1, 0), (12, 2, 0), (14, 2, 0)]):
                a.note('gtr', bb, st_, d, midi(g), 1.0 if ring else 0.85, kind='chord' if ring else 'chug')
            a.hits('kick', bb, 'x..x....x.x.....' if h == 0 else 'x..x....x.x...x.')
            if bb != 15: a.hits('snare', bb, '....x.......x...')
            a.hits('hat', bb, 'x.o.x.o.x.o.x.o.', v=0.9)
            if h == 1: a.hits('china', bb, 'x.......x.......', v=0.7)
    for b in (0, 8): a.note('crash', b, 0, 1, 60, 1.0); a.note('fx', b, 0, 1, 60, 0.18, s='boom')
    a.note('crash', 4, 0, 1, 60, 0.7); a.note('crash', 12, 0, 1, 60, 0.7)
    tomfill(a, 15, 8); a.hits('snare', 15, '....x...x.x.xxxx', v=0.95); a.note('fx', 15, 0, 16, 60, 0.24, s='short')

    # ---- p2: it stops the room. Then every earlier trick
    p = s.section('p2', 20, seg=2)
    QUIET = ['Cm', 'Ab', 'Fm', 'G']
    for b in range(4):
        sym = QUIET[b]; frm = QUIET[b - 1] if b else 'G'
        stack(p, b, sym, frm, [0.3, 0.4, 0.6, 0.8][b]); bed(p, b, sym, 0.75 + 0.05 * b); low(p, b, sym, frm, 'long', 0.6 if b < 2 else 0.8)
        stars(p, b, sym, (0, 3, 6, 8, 11, 14), 0.75)
        p.hits('kick', b, 'x...............', v=0.6)                 # a heartbeat
    p.note('plow', 0, 0, 30, 24, 0.9); p.note('plow', 0, 0, 30, 36, 0.7)
    for b, text in enumerate(['C4:4 Eb4:4 G4:8', 'Ab4:8 Eb4:8', 'F4:4 Ab4:4 C5:8', 'B4:8 D5:8']): p.line('piano', b, text, 0.8)
    for b in (2, 3):                                                # the chord chopped into sixteenths, growing
        for n in range(16):
            for m in chord(QUIET[b], 4): p.note('pulse', b, n, 0.6, m, 0.15 + 0.4 * ((b - 2) * 16 + n) / 31)
    roll(p, 3, 0, 16, 0.25, 0.95)
    p.note('fx', 0, 0, 1, 60, 0.3, s='shatter'); p.note('fx', 0, 0, 1, 60, 0.3, s='whoosh'); p.note('fx', 0, 0, 1, 60, 0.2, s='boom')
    p.note('fx', 2, 0, 32, 60, 0.24, s='riser')
    p.note('fx', 3, 15.99, 1, 60, 0.3, s='rev', lead=1.6 - 0.01 * s.step); p.note('fx', 3, 15.99, 1, 60, 0.3, s='rroll', lead=2.2 - 0.01 * s.step)
    for q, (who, lines, chs) in enumerate(QUOTE):
        for n in range(4):
            b = 4 + q * 4 + n; sym = chs[n]; frm = chs[n - 1] if n else (QUOTE[q - 1][2][3] if q else 'G')
            g = groot(sym); text = lines[n]
            feet(p, b); p.hits('kick', b, 'x.......x.......')
            if b != 19: p.hits('snare', b, '....x.......x...')
            p.hits('china', b, 'x...x...x...x...', v=0.6)
            stack(p, b, sym, frm, 0.85); bed(p, b, sym, 0.85)
            if who in ('foundry', 'vault'): p.line('lead', b, text, 0.5)        # the lead shadows whoever has the tune
            else:                                                   # the long ones: the lead and strings sing them, over the pulse
                legato(p, 'lead', b, text, 0.9); sing(p, 'strings', b, text, 0.8); ost(p, b, sym, 0.8)
            if who == 'foundry':
                hammer(p, b, g); p.line('whistle', b, text, 1.0)
                for st_ in ACC: p.note('anvil', b, st_, 2, 60, 1.0 if st_ in (0, 8) else 0.7)
            elif who == 'hive':
                gallop(p, b, g); legato(p, 'buzz', b, text, 0.6)
                p.note('legs', b, 10, 4, 60, 0.8, n=14, curve=0.75); p.note('legs', b, 2, 2, 67, 0.7, n=7)
            elif who == 'vault':
                trem(p, b, g); p.line('glass', b, text, 1.0); p.line('glass', b, text, 0.6, octave=1)
                p.hits('tick', b, 'xoxoxoxoxoxoxoxo', v=0.9)
            else:
                gallop(p, b, g); p.line('harpsi', b, text, 0.8, octave=-1); p.line('quill', b, text, 0.9)
                for st_ in (0, 8):                                  # the harpsichord's other hand: the chord, struck twice a bar
                    for m in chord(sym, 4): p.note('harpsi', b, st_, 3, m if m <= 71 else m - 12, 0.5)
                p.hits('keys', b, 'xoxoxoxoxoxoxoxo', v=0.9)
            if n == 0:
                p.note('crash', b, 0, 1, 60, 1.0 if q == 0 else 0.75); brass(p, b, sym, (0,), 0.9); p.note('timp', b, 0, 6, tp(sym), 0.85)
    p.note('fx', 4, 0, 1, 60, 0.18, s='boom'); p.note('fx', 4, 0, 1, 60, 0.3, s='clang')
    p.note('fx', 12, 0, 1, 60, 0.26, s='tinkle'); p.note('fx', 16, 0, 1, 60, 0.4, s='book'); p.note('fx', 19, 9, 6, 60, 0.4, s='bell')
    tomfill(p, 19, 8); p.hits('snare', 19, '....x...x.x.xxxx', v=0.95); p.note('fx', 19, 0, 16, 60, 0.24, s='short')

    # ---- p3: everything
    q = s.section('p3', 24, seg=4)        # the last phase: nothing follows it, so its pieces can be longer
    for b in range(24):
        if b < 8: sym, text, frm = TH_CH[b], TH[b], TH_CH[b - 1] if b else 'Cm'
        elif b < 16: sym, text, frm = AN_CH[b - 8], AN[b - 8], AN_CH[b - 9] if b > 8 else 'Bb'
        elif b < 20: sym, text, frm = RUN_CH[b - 16], RUN[b - 16], RUN_CH[b - 17] if b > 16 else 'G'
        else: sym, text, frm = 'Cm', None, 'G' if b == 20 else 'Cm'
        g = groot(sym)
        bed(q, b, sym, 1.0)
        if b < 20:
            feet(q, b, 0.9); q.hits('kick', b, 'x.......x.......')
            q.hits('china', b, 'x...x...x...x...', v=0.65)
            stack(q, b, sym, frm, 0.9)
            if b < 8: trem(q, b, g)
            elif b < 16: gallop(q, b, g)
            else: hammer(q, b, g)
            q.line('lead', b, text, 1.0); sing(q, 'strings', b, text, 0.9)
            if b % 2 == 0: brass(q, b, sym, (0,), 0.9); q.note('timp', b, 0, 6, tp(sym), 0.85)
        if b < 8:                                                   # the theme in octaves, and in sixths second time
            q.line('lead', b, text, 0.55, octave=-1)
            if b >= 4: q.line('quill', b, third(text, 'C'), 0.8)
            q.hits('snare', b, '....x.......x...')
        elif b < 16:                                                # the answer, the horns singing THE VOID's tune against it
            voidline = RISE[b - 8] if b < 14 else RISE[7] if b == 14 else None
            if voidline: legato(q, 'brass', b, voidline, 1.0, octave=-1); q.line('star', b, voidline, 0.55, octave=1)
            if b >= 12: q.line('lead', b, third(text, 'C'), 0.5, octave=-1)
            q.hits('snare', b, '....x.......x...' if b != 15 else '....x...x.x.xxxx')
        elif b < 20:                                                # the run: the snare broken up under it
            q.line('quill', b, text, 0.9); q.line('glass', b, text, 0.6)
            q.hits('snare', b, ['x.....x...x.x..xx...x.x...x.xxxx', '....x..x..x...x.x.x...x.x..xx.xx',
                               'x..x..x...x.x...x..x..x.xx..x.xx', '....x.......x...x...x...x.x.xxxx'][b - 16], steps=32, v=0.9)
        else:                                                       # held on C: one chord, the pulse, the drums thinned out
            q.note('gtr', b, 0, 16, midi('C2'), 1.0, kind='chord'); q.note('bass', b, 0, 15, midi('C2'), 0.8)
            ost(q, b, 'Cm', 0.95); stars(q, b, 'Cm', (2, 7, 11, 14), 0.75)
            stack(q, b, 'Cm', frm, 0.6)
            q.hits('kick', b, 'x..x............')
            for n, (st_, semi) in enumerate([(8, 5), (11, 0), (14, -5)]): q.note('tom', b, st_, 2, 60, 0.8, semi=semi)
    for b in (0, 8, 16): q.note('crash', b, 0, 1, 60, 1.0); q.note('fx', b, 0, 1, 60, 0.18, s='boom')
    for b in (4, 12, 18): q.note('crash', b, 0, 1, 60, 0.7)
    q.note('fx', 16, 0, 1, 60, 0.3, s='shatter')
    tomfill(q, 7, 12); tomfill(q, 15, 8); q.note('fx', 15, 0, 16, 60, 0.22, s='short')
    q.note('crash', 20, 0, 1, 60, 1.0); q.note('fx', 20, 0, 1, 60, 0.3, s='roll'); q.note('fx', 20, 0, 1, 60, 0.18, s='boom')
    q.note('plow', 20, 0, 30, 24, 0.9); q.note('plow', 20, 0, 30, 36, 0.7); q.note('plow', 22, 0, 30, 24, 0.8)
    brass(q, 20, 'Cm', (0,), 1.0, dur=12); brass(q, 22, 'Cm', (0,), 0.9, dur=12)
    legato(q, 'lead', 23, 'r:8 G5:2 F5:2 Eb5:2 D5:2', 0.9)
    roll(q, 23, 8, 16, 0.3, 0.95, width=0.5); q.note('fx', 22, 0, 32, 60, 0.24, s='riser')
    q.note('fx', 23, 15.99, 1, 60, 0.3, s='rev', lead=1.6 - 0.01 * s.step); q.note('fx', 23, 15.99, 1, 60, 0.3, s='rroll', lead=2.2 - 0.01 * s.step)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    s.start = 'intro'
    return s
