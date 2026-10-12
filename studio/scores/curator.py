"""curator: THE CURATOR, THE ARCHIVE's boss (MUSIC-PLAN.md). "It arranges the encounter rather than
fighting it", so its theme is a dance: a stately waltz in three, a string quartet over iron. It is THE
ARCHIVE's own tune set out again, the three knocks now a whole bar of the waltz and the piece taken down
held for the next, over the same ground. Each phase is the room arranged once more. 150 BPM in
three-four, E minor.

  intro  8 bars, once  the ground alone: a cello on the first beat, three knocks on wood, the
                       pizzicato finding the other two beats; then the last shelf of the tune, and
  p1     32 bars       the collection: the tune on the strings over an oom-pah-pah of cello and
                       pizzicato; second time round in sixths, with a bass, a choir and a slow iron beat
  p2     32 bars       the filing: guitars on the ground, an anvil on every other bar, the tune in
                       octaves; second time round the guitars gallop in three
  p3     32 bars       the room set again: the ground goes down by semitones under the second tune,
                       both feet running, a choir. And afterwards it is set again a piece short: the
                       last bar is not there

"Afterwards I set the room again, a piece short."
"""
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, steam
from scores._common import third, kit, forge, archive, tomfill, riff, sing, legato, stopchord, bowed

TITLE = 'A Piece Short'
ORDER = ['intro', 'p1', 'p2', 'p3', 'p3']

GROUND = ['Em', 'D', 'C', 'B']
# THE ARCHIVE's tune in three: (the three knocks, a bar; the piece taken down, the next bar)
CARD = [('B4:4 B4:4 B4:4', 'E5:12'), ('A4:4 A4:4 A4:4', 'D5:12'), ('G4:4 G4:4 G4:4', 'C5:12'), ('F#4:4 F#4:4 F#4:4', 'B4:8 D#5:4'),
        ('E5:4 E5:4 E5:4', 'B5:12'), ('D5:4 D5:4 D5:4', 'A5:12'), ('C5:4 C5:4 C5:4', 'G5:12'), ('B4:4 B4:4 B4:4', 'F#5:8 D#5:4')]
# its second tune over the ground going down by semitones: (three steps down, a bar; up to a held note, the next)
FALL = [('Em', 'E2'), ('B', 'D#2'), ('D', 'D2'), ('A', 'C#2'), ('C', 'C2'), ('Am', 'A1'), ('B', 'B1'), ('B', 'B1')]
SHELF = [('G5:4 F#5:4 E5:4', 'B5:12'), ('F#5:4 E5:4 D#5:4', 'B5:12'), ('F#5:4 E5:4 D5:4', 'A5:12'), ('E5:4 D5:4 C#5:4', 'A5:12'),
         ('E5:4 D5:4 C5:4', 'G5:12'), ('C5:4 B4:4 A4:4', 'E5:12'), ('D#5:4 C#5:4 B4:4', 'F#5:12'), ('B4:4 D#5:4 F#5:4', 'B5:12')]
ROOT = {'Em': 'E2', 'D': 'D2', 'C': 'C2', 'B': 'B1', 'A': 'A1', 'Am': 'A1'}
PAH = {'Em': (55, 59), 'D': (54, 57), 'C': (55, 60), 'B': (54, 59), 'A': (57, 61), 'Am': (57, 60)}      # the pizzicato's two notes on beats two and three

def song():
    K = kit(); A = archive(); F = forge()
    chugs = {r: t for r, t in K['chugs'].items() if r != midi('F2')}
    beat = 60.0 / 150
    s = Song('curator', 150, beats=3, steps=12, target=-10.0, ceil=-2.0, room=dict(decay=2.4, pre=0.02, bright=5600.0, dark=1500.0),
             echo=dict(time=beat, fb=0.3, taps=3), master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(F['kick']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('dkick', Bus(hit(K['kick_m']), gain=0.7, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(F['snare'], tune=2.0), gain=0.9, rev=0.14, fx=[lambda x: clip(x, 0.6)]))        # the iron in it rings on F as recorded: moved to G
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.5, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.35, rev=0.22, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.26, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('anvil', Bus(hit(F['anvil'], human=0.002, tune=2.0), gain=1.3, rev=0.3, fx=[lambda x: clip(hp(x, 250.0), 0.55)]))     # its ring moved from D up to E
    s.add('tick', Bus(hit(F['tick'], human=0.002, tune=2.0), gain=1.0, rev=0.1, fx=[lambda x: clip(hp(x, 700.0), 0.5)]))
    s.add('clave', Bus(hit(A['clave']), gain=0.8, dly=0.2, rev=0.2, fx=[lambda x: clip(hp(x, 500.0), 0.45)]))
    s.add('card', Bus(hit(A['card'], human=0.003), gain=0.6, rev=0.08, fx=[lambda x: hp(x, 700.0)]))
    s.add('timp', Bus(sampler(A['timp'], rel=0.5), gain=0.55, rev=0.28, fx=[lambda x: clip(x, 0.6)]))
    s.add('gtr', Bus(guitar(chugs, K['chords'], wide=0.72), gain=0.42, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.08, spread=0.0, sub=0.5, sq=0.4, cutoff=500.0, env=2.4, fdecay=0.1, res=1.0,
                            track=0.3, a=0.003, d=0.1, s=0.8, r=0.05, dirt=0.75),
                      gain=0.4, duck=0.4, fx=[lambda x: clip(peak(hp(x, 40.0), 700.0, 2.5, 1.0), 0.75)]))
    s.add('cello', Bus(bowed(), gain=0.34, rev=0.18, duck=0.12, fx=[lambda x: peak(hp(x, 70.0), 300.0, 3.0, 1.2)]))
    s.add('low', Bus(sampler(A['low'], rel=0.25), gain=0.7, rev=0.2, fx=[lambda x: hp(x, 60.0)]))
    s.add('pizz', Bus(sampler(A['pizz'], rel=0.1), gain=0.6, rev=0.25, fx=[lambda x: hp(x, 150.0)]))
    # the strings' accent: a minor stab under the minor chords, a major one under the rest
    s.add('minor', Bus(sampler(A['minor'], rel=0.12), gain=0.5, rev=0.22, duck=0.1, fx=[lambda x: hp(x, 60.0)]))
    s.add('major', Bus(sampler(A['major'], rel=0.12), gain=0.45, rev=0.22, duck=0.1, fx=[lambda x: hp(x, 100.0)]))
    s.add('strings', Bus(sampler(A['strings'], rel=0.22), gain=0.62, rev=0.38, fx=[lambda x: hp(x, 250.0)]))
    s.add('viol', Bus(synth('saw', voices=3, detune=0.1, spread=0.5, sq=0.15, cutoff=2900.0, env=0.7, fdecay=0.3, res=0.9, a=0.03, d=0.2,
                            s=0.9, r=0.16, vib=0.14, vibat=0.25, glide=0.05, dirt=0.2),
                      gain=0.27, dly=0.2, rev=0.3, duck=0.08, fx=[lambda x: peak(hp(x, 250.0), 2000.0, 1.5, 1.0)]))
    s.add('choir', Bus(sampler(A['choir'], rel=0.5), gain=0.26, rev=0.5, duck=0.2, fx=[lambda x: hp(x, 180.0)]))
    s.add('fx', Bus(clips({'boom': boom(secs=2.4), 'riser': riser(2 * s.bar, lo=300.0, hi=8000.0), 'rev': reverse(K['crash'], 1.6),
                           'page': A['page'], 'stamp': A['stamp'], 'strike': steam(0.16, lo=1300.0, hi=5200.0),
                           'stop': stopchord('B2 F#3 B3 D#4')}), gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def root(sym): return midi(ROOT[sym])
    def bed(sec, bar, sym, v=1.0, bars=2):
        for m in chord(sym, 3):
            while m < 55: m += 12
            while m > 68: m -= 12
            sec.note('choir', bar, 0, 12 * bars - 0.5, m, v)
    def stab(sec, bar, sym, v=0.85):
        r = root(sym) % 12
        if sym in ('Em', 'Am'): sec.note('minor', bar, 0, 3, r + 36, v)
        else: sec.note('major', bar, 0, 3, r + 48 if r + 48 <= 53 else r + 36, v)
    def oompah(sec, bar, sym, v=0.8, bass=None):
        """A bar of the quartet's waltz: the cello on one, the pizzicato on two and three."""
        r = midi(bass) if bass else root(sym)
        sec.note('cello', bar, 0, 3.4, r + 12, v); sec.note('low', bar, 0, 3, r + 12, v * 0.9)
        for at in (4, 8):
            for p in PAH[sym]: sec.note('pizz', bar, at, 1.5, p, v * (0.85 if at == 4 else 0.75))
    def tune(sec, bar, pair, v=1.0, lead=1.0, sixths=False):
        """Two bars of a tune on the strings and the violin over them."""
        for h, text in enumerate(pair):
            sing(sec, 'strings', bar + h, text, v * 0.9)
            if lead: legato(sec, 'viol', bar + h, text, v * lead)
            if sixths: sec.line('viol', bar + h, third(text, 'E'), v * 0.45, octave=-1)
    def knocks(sec, bar, v=0.6):
        for at in (0, 4, 8): sec.note('clave', bar, at, 1, 60, v * (1.0 if at == 8 else 0.85))

    # ---- intro: the ground alone
    i = s.section('intro', 8, seg=4, loop=False, next='p1', lock=True)
    for u in range(4):
        sym = GROUND[u]; b = u * 2
        for h in (0, 1):
            i.note('cello', b + h, 0, 3.4, root(sym) + 12, 0.7 + 0.06 * u); i.note('low', b + h, 0, 3, root(sym) + 12, 0.7 + 0.06 * u)
            if u >= 1:
                for at in (4, 8):
                    for p in PAH[sym]: i.note('pizz', b + h, at, 1.5, p, 0.5 + 0.08 * u)
        knocks(i, b, 0.85 + 0.05 * u)
        if u >= 2: bed(i, b, sym, 0.6 + 0.1 * (u - 2)); i.note('bass', b, 0, 22, root(sym), 0.25)
    tune(i, 6, CARD[3], 0.8, 0.7)
    i.note('fx', 0, 0, 4, 60, 0.4, s='page'); i.note('fx', 0, 0, 1, 60, 0.35, s='stamp')
    i.note('timp', 6, 0, 8, 35, 0.6); i.note('timp', 7, 0, 8, 35, 0.75); i.note('fx', 6, 0, 24, 60, 0.16, s='riser')
    i.note('fx', 7, 11.99, 1, 60, 0.26, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- p1: the collection. A string quartet's waltz
    a = s.section('p1', 32, seg=4, level=1.0)
    for u in range(16):
        k = u % 8; sym = GROUND[u % 4]; b = u * 2; second = u >= 8
        tune(a, b, CARD[k], 1.0, 0.6, sixths=second)
        if second: bed(a, b, sym, 0.7); a.note('bass', b, 0, 22, root(sym), 0.3)
        else: knocks(a, b, 0.9)
        for h in (0, 1):
            bb = b + h
            oompah(a, bb, sym, 0.85)
            if not second:
                if h == 0: a.hits('kick', bb, 'x...........', v=0.55)
                a.hits('card', bb, '........x...', v=0.85)
            else:
                a.hits('kick', bb, 'x...........', v=0.7)
                if h == 1: a.hits('snare', bb, '........x...', v=0.8)
                a.hits('tick', bb, '....x...x...', v=0.7)
        if second and u % 2 == 0: a.note('anvil', b, 0, 2, 60, 0.6)
    a.note('fx', 0, 0, 1, 60, 0.35, s='stamp'); a.note('crash', 0, 0, 1, 60, 0.6)
    a.note('fx', 16, 0, 1, 60, 0.35, s='stamp'); a.note('crash', 16, 0, 1, 60, 0.8); a.note('fx', 16, 0, 1, 60, 0.14, s='boom')
    a.note('timp', 30, 0, 8, 35, 0.7); a.note('timp', 31, 0, 8, 35, 0.8); tomfill(a, 31, 8)

    # ---- p2: the filing. Iron under the quartet
    p = s.section('p2', 32, seg=4)
    for u in range(16):
        k = u % 8; sym = GROUND[u % 4]; b = u * 2; second = u >= 8; g = ROOT[sym]
        tune(p, b, CARD[k], 1.0, 1.0, sixths=second)
        bed(p, b, sym, 0.95); stab(p, b, sym, 0.8); p.note('anvil', b, 0, 2, 60, 0.9)
        if second: p.note('timp', b, 0, 8, root(sym) % 12 + 36 if sym != 'B' else 35, 0.8)
        for h in (0, 1):
            bb = b + h
            riff(p, bb, f'{g}*:4 {g}:2 {g}:2 {g}:2 {g}:2' if not second else ' '.join(f'{g}*:2 {g}:1 {g}:1' for _ in range(3)))
            p.hits('kick', bb, 'x.........x.' if not second else 'x.....x...x.')
            p.hits('snare', bb, '........x...' if bb != 31 else '....x...x.xx')
            p.hits('hat', bb, 'x.x.x.x.x.x.' if not second else 'xoxoxoxoxoxo', v=0.85)
    for b in (0, 16): p.note('crash', b, 0, 1, 60, 1.0); p.note('fx', b, 0, 1, 60, 0.18, s='boom'); p.note('fx', b, 0, 1, 60, 0.3, s='stamp')
    for b in (8, 24): p.note('crash', b, 0, 1, 60, 0.7)
    tomfill(p, 15, 8); tomfill(p, 31, 8); p.note('fx', 30, 0, 24, 60, 0.2, s='riser')

    # ---- p3: the room set again. The ground by semitones; and at the end, a piece short
    q = s.section('p3', 32, seg=4)
    for u in range(16):
        k = u % 8; sym, bassn = FALL[k]; b = u * 2; second = u >= 8; g = ROOT[sym]
        gone = u == 15                                              # the last bar of all is not there
        tune(q, b, (SHELF[k][0],) if gone else SHELF[k], 1.0, 1.0, sixths=second)
        bed(q, b, sym, 1.0, 1 if gone else 2); stab(q, b, sym, 0.85); q.note('anvil', b, 0, 2, 60, 0.9)
        q.note('timp', b, 0, 8, 35 if sym == 'B' else root(sym) % 12 + 36, 0.85)
        for h in (0, 1):
            bb = b + h
            if gone and h == 1: break
            riff(q, bb, ' '.join(f'{g}*:2 {g}:2' for _ in range(3)), bass=False)
            for n in range(6): q.note('bass', bb, n * 2, 1.7, midi(bassn), 1.0 if n % 2 == 0 else 0.82)
            q.note('cello', bb, 0, 3, midi(bassn) + 12, 0.9)
            q.hits('dkick', bb, 'xoxoxoxoxoxo', v=0.85, len=0.09); q.hits('kick', bb, 'x...........')
            q.hits('snare', bb, '........x...'); q.hits('china', bb, 'x...x...x...', v=0.65)
    for b in (0, 16): q.note('crash', b, 0, 1, 60, 1.0); q.note('fx', b, 0, 1, 60, 0.2, s='boom'); q.note('fx', b, 0, 1, 60, 0.3, s='stamp')
    for b in (8, 24): q.note('crash', b, 0, 1, 60, 0.7)
    tomfill(q, 15, 8)
    q.note('fx', 31, 0, 2, 60, 0.45, s='strike'); q.note('fx', 31, 0, 8, 60, 0.4, s='stop')
    q.note('fx', 31, 11.99, 1, 60, 0.3, s='rev', lead=1.1 - 0.01 * s.step)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    s.start = 'intro'
    return s
