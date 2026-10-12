"""archive: THE ARCHIVE, fracture i (MUSIC-PLAN.md), and the first track of disk two, "Cracks in the
Plane". A collection, catalogued by someone else: everything is shelved the same way, so every bar of
the tune is the same shape on a lower shelf (three knocks, then the piece taken down), over a bass that
steps down and never arrives. The redactors are still at work, so notes are struck out: where one
should be there is the stroke of a pen, and a moment later its ghost, thinner and an octave up, as a
revenant gets back up once. Phrases end with the tape switched off under them. Paper for percussion.
124 BPM, E minor.

  intro  4 bars, once     a page turned, a stamp, the ground plucked, the knocks on wood
  a      16 bars, calm    the tune on an old upright over a plucked ground and flicked cards; second
                          time round two of its notes are struck out and come back as ghosts
  b      16 bars, fight   the tune on a lead, the ground in eighths, drums with hits missing
  c      16 bars, fight   the floor taking itself away: the ground goes down by semitones, a second
                          tune steps down each shelf, and the last beat of every fourth bar is deleted

The ground (E, D, C, B) and both tunes are THE CURATOR's too.
"""
from daw import Song, Bus, chord, midi, hp, highshelf, peak, clip, gate, crush
from inst import hit, synth, sampler, clips, riser, reverse, boom, steam, layer
from scores._common import third, kit, archive, tomfill, sing, stopchord, bowed

TITLE = 'Struck From the Record'
ORDER = ['intro', 'a', 'b', 'c', 'b', 'a']

# the ground: one bar a step, down a fourth and round again
GROUND = ['Em', 'D', 'C', 'B']
# the tune: three knocks on the chord's fifth, then its root taken down off the shelf; second time from the root up
CARD = ['B4:2 B4:2 B4:4 E5:8',
        'A4:2 A4:2 A4:4 D5:8',
        'G4:2 G4:2 G4:4 C5:8',
        'F#4:2 F#4:2 F#4:4 B4:4 D#5:4',
        'E5:2 E5:2 E5:4 B5:8',
        'D5:2 D5:2 D5:4 A5:8',
        'C5:2 C5:2 C5:4 G5:8',
        'B4:2 B4:2 B4:4 F#5:4 D#5:4']
# the ground going down by semitones, and the second tune: three steps down, then up to a held note
FALL = [('Em', 'E2'), ('B', 'D#2'), ('D', 'D2'), ('A', 'C#2'), ('C', 'C2'), ('Am', 'A1'), ('B', 'B1'), ('B', 'B1')]
SHELF = ['G5:2 F#5:2 E5:4 B5:8',
         'F#5:2 E5:2 D#5:4 B5:8',
         'F#5:2 E5:2 D5:4 A5:8',
         'E5:2 D5:2 C#5:4 A5:8',
         'E5:2 D5:2 C5:4 G5:8',
         'C5:2 B4:2 A4:4 E5:8',
         'D#5:2 C#5:2 B4:4 F#5:8',
         'B4:4 D#5:4 F#5:4 B5:4']
ROOT = {'Em': 'E2', 'D': 'D2', 'C': 'C2', 'B': 'B1', 'A': 'A1', 'Am': 'A1'}
PIZZ = {'Em': 55, 'D': 57, 'C': 55, 'B': 54, 'A': 57, 'Am': 57}
STOP = {'Em': 'E3 B3 E4 G4', 'D': 'D3 A3 D4 F#4', 'C': 'C3 G3 C4 E4', 'B': 'B2 F#3 B3 D#4', 'A': 'A2 E3 A3 C#4'}

def song():
    K = kit(); A = archive()
    beat = 60.0 / 124
    s = Song('archive', 124, target=-12.0, ceil=-1.5, room=dict(decay=2.2, pre=0.02, bright=5200.0, dark=1400.0),
             echo=dict(time=beat * 0.75, fb=0.4, taps=5), master=lambda x: highshelf(hp(x, 30.0), 8500.0, -2.0))
    s.add('kick', Bus(hit(K['kick_e']), gain=0.5, key=True, fx=[lambda x: clip(x, 0.75)]))
    s.add('snare', Bus(hit(layer((gate(K['snare_m'], 0.16, 0.06), 1.0), (A['stamp'], 0.5))), gain=0.75, rev=0.1, fx=[lambda x: clip(x, 0.7)]))    # dry: a book shut
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.55, fx=[lambda x: hp(x, 600.0)]))
    s.add('card', Bus(hit(A['card'], human=0.003), gain=0.7, rev=0.08, fx=[lambda x: hp(x, 700.0)]))
    s.add('clave', Bus(hit(A['clave']), gain=0.45, dly=0.2, rev=0.2, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.25, rev=0.3, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.5, rev=0.2, fx=[lambda x: clip(x, 0.7)]))
    s.add('bass', Bus(synth('saw', voices=1, sq=0.3, sub=0.4, cutoff=380.0, env=2.2, fdecay=0.14, res=0.9, track=0.35, a=0.006, d=0.18,
                            s=0.85, r=0.08, dirt=0.5), gain=0.25, duck=0.5, fx=[lambda x: peak(hp(x, 40.0), 650.0, 2.5, 1.0)]))
    s.add('cello', Bus(bowed(), gain=0.3, rev=0.16, duck=0.15, fx=[lambda x: peak(hp(x, 70.0), 300.0, 3.0, 1.2)]))
    s.add('low', Bus(sampler(A['low'], rel=0.25), gain=0.75, rev=0.2, fx=[lambda x: hp(x, 60.0)]))      # the ground, plucked
    s.add('pizz', Bus(sampler(A['pizz'], rel=0.1), gain=0.6, rev=0.25, fx=[lambda x: hp(x, 150.0)]))
    s.add('piano', Bus(sampler(A['piano'], rel=0.5), gain=0.65, rev=0.35, dly=0.18, fx=[lambda x: hp(x, 120.0)]))
    # the revenant: whatever was struck out, back once, thinner
    s.add('ghost', Bus(synth('square', pw=0.2, cutoff=3800.0, a=0.004, d=0.3, s=0.45, r=0.25, vib=0.1), gain=0.26, dly=0.45, rev=0.5,
                       fx=[lambda x: hp(crush(x, 5, 8), 900.0)]))
    s.add('lead', Bus(synth('square', pw=0.3, voices=2, detune=0.08, spread=0.4, cutoff=2700.0, env=1.2, fdecay=0.18, res=1.2, a=0.006,
                            d=0.16, s=0.75, r=0.1, vib=0.09, dirt=0.3), gain=0.2, dly=0.24, rev=0.24, duck=0.1, fx=[lambda x: hp(x, 250.0)]))
    s.add('strings', Bus(sampler(A['strings'], rel=0.25), gain=0.42, rev=0.4, fx=[lambda x: hp(x, 250.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.16, spread=1.0, cutoff=1000.0, track=0.2, a=0.4, d=0.5, s=0.9, r=0.5), gain=0.12, rev=0.45, duck=0.35, fx=[lambda x: hp(x, 220.0)]))

    table = {'boom': boom(), 'short': riser(s.bar, lo=600.0), 'rev': reverse(K['crash'], 1.6), 'page': A['page'], 'stamp': A['stamp'],
             'strike': steam(0.16, lo=1300.0, hi=5200.0)}
    for sym in STOP: table['stop' + sym] = stopchord(STOP[sym])          # each chord with its tape switched off
    s.add('fx', Bus(clips(table), gain=1.0, rev=0.22, fx=[lambda x: clip(x, 0.8)]))

    def ground(sec, bar, sym, mode, bass=None, cut=False):
        """The ground: the bass, and an octave over it a plucked string on the beats (calm) or a bowed
        one in eighths (a fight). cut: the bar's last beat is struck out."""
        r = midi(bass or ROOT[sym]); last = 12 if cut else 16
        if mode == 'calm':
            sec.note('bass', bar, 0, 14, r, 0.5)
            for at in (0, 4, 8, 12): sec.note('low', bar, at, 3.0, r + 12, 0.95 if at == 0 else 0.7)
        else:
            for i in range(8):
                if i * 2 >= last: break
                sec.note('bass', bar, i * 2, 1.7, r + (12 if i in (3, 7) else 0), 1.0 if i % 2 == 0 else 0.82)
                sec.note('cello', bar, i * 2, 1.3, r + 12, 0.95 if i % 4 == 0 else 0.7)
    def struck(sec, bar, sym, at=12, v=0.4):
        """A beat struck out: the pen, and the chord's tape switched off."""
        sec.note('fx', bar, at, 2, 60, v, s='strike'); sec.note('fx', bar, at, 4, 60, 0.3, s='stop' + ('A' if sym == 'Am' else sym))

    # ---- intro: a page turned, a stamp, the ground plucked
    i = s.section('intro', 4, loop=False, next='a', lock=True, level=-3.0)
    for b in range(4):
        sym = GROUND[b]; r = midi(ROOT[sym])
        for at in (0, 8): i.note('low', b, at, 6, r + 12, 0.75 + 0.06 * b)
        if b >= 1: i.note('clave', b, 0, 1, 60, 0.7); i.note('clave', b, 2, 1, 60, 0.6); i.note('clave', b, 4, 1, 60, 0.8)
        if b >= 2: i.line('piano', b, CARD[b], 0.75, octave=-1); i.note('bass', b, 0, 14, r, 0.35); i.hits('kick', b, 'x.......x.......', v=0.6)
    i.note('fx', 0, 0, 4, 60, 0.4, s='page'); i.note('fx', 0, 0, 1, 60, 0.4, s='stamp')
    struck(i, 3, 'B', 12, 0.3)
    i.note('fx', 3, 15.99, 1, 60, 0.22, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- a: calm. The tune on the upright; second time round, two notes struck out
    a = s.section('a', 16, level=-3.5)
    for b in range(16):
        k = b % 8; sym = GROUND[b % 4]; second = b >= 8
        ground(a, b, sym, 'calm')
        a.hits('kick', b, 'x...............' if not second else 'x.......x.......', v=0.75)
        a.hits('card', b, '....x.......x...' if not second else '..x.x.....x.x...', v=0.85)
        a.chordn('pad', b, 0, 15.5, sym, 4, 0.55 if not second else 0.8)
        if second:
            for at in (6, 14): a.note('pizz', b, at, 1.5, PIZZ[sym], 0.7)
        if second and k in (2, 6):                                  # the C bars: the long note is struck out, and comes back as its ghost
            toks = CARD[k].split()
            a.line('piano', b, ' '.join(toks[:3]), 0.9, octave=-1)
            a.note('fx', b, 8, 2, 60, 0.4, s='strike'); a.note('ghost', b, 10, 6, midi(toks[3].partition(':')[0]) + 12, 0.9)
        else: a.line('piano', b, CARD[k], 0.9, octave=-1)
    a.note('fx', 0, 0, 1, 60, 0.35, s='stamp'); a.note('fx', 8, 0, 1, 60, 0.3, s='stamp'); a.note('fx', 8, 0, 4, 60, 0.3, s='page')
    a.note('fx', 15, 12, 4, 60, 0.26, s='stopB'); a.note('fx', 15, 15.99, 1, 60, 0.2, s='rev', lead=1.6 - 0.01 * s.step)

    # ---- b: fight. The tune on a lead, the ground in eighths, drums with hits missing
    f = s.section('b', 16, next='c')
    for b in range(16):
        k = b % 8; sym = GROUND[b % 4]; second = b >= 8
        ground(f, b, sym, 'drive')
        f.hits('kick', b, 'x.....x.x.......' if b % 2 == 0 else 'x.....x.x.....x.')
        f.hits('snare', b, '....x.......x...' if b != 15 else '....x.......x.xx')
        f.hits('hat', b, 'xoxo.oxoxox.xoxo' if b % 2 == 0 else 'xox.xoxo.oxoxox.', v=0.85)
        f.chordn('pad', b, 0, 15.5, sym, 4, 0.9)
        for at in (6, 14): f.note('pizz', b, at, 1.5, PIZZ[sym], 0.8)
        f.line('lead', b, CARD[k], 1.0); f.line('piano', b, CARD[k], 0.7, octave=-1)
        if second: sing(f, 'strings', b, CARD[k], 0.8); f.line('lead', b, third(CARD[k], 'E'), 0.45, octave=-1)
    for b in (0, 8): f.note('crash', b, 0, 1, 60, 1.0); f.note('fx', b, 0, 1, 60, 0.3, s='stamp')
    f.note('fx', 0, 0, 1, 60, 0.18, s='boom'); f.note('crash', 4, 0, 1, 60, 0.6); f.note('crash', 12, 0, 1, 60, 0.6)
    f.note('fx', 15, 0, 16, 60, 0.24, s='short'); tomfill(f, 15)

    # ---- c: fight. The floor taking itself away
    c = s.section('c', 16, next='b')
    for b in range(16):
        k = b % 8; sym, bass = FALL[k]; second = b >= 8; cut = k in (3, 7)
        ground(c, b, sym, 'drive', bass, cut)
        c.hits('kick', b, 'x..x....x..x....' if not cut else 'x..x....x.......')
        c.hits('snare', b, '....x.......x...' if not cut else '....x...........')
        c.hits('hat', b, 'x.x.x.x.x.x.x.x.' if not cut else 'x.x.x.x.x.x.....', v=0.9)
        c.chordn('pad', b, 0, 11.5 if cut else 15.5, sym, 4, 0.9)
        if not cut:
            for at in (6, 14): c.note('pizz', b, at, 1.5, PIZZ[sym], 0.8)
        c.line('lead', b, SHELF[k], 1.0); c.line('piano', b, SHELF[k], 0.7, octave=-1)
        if second: sing(c, 'strings', b, SHELF[k], 0.8); c.line('lead', b, third(SHELF[k], 'E'), 0.45, octave=-1)
        if cut: struck(c, b, sym, 12, 0.45)
    for b in (0, 8): c.note('crash', b, 0, 1, 60, 0.9); c.note('fx', b, 0, 1, 60, 0.18, s='boom'); c.note('fx', b, 0, 1, 60, 0.3, s='stamp')
    for b in (4, 12): c.note('crash', b, 0, 1, 60, 0.6)
    c.note('fx', 15, 15.99, 1, 60, 0.26, s='rev', lead=1.6 - 0.01 * s.step)

    s.moods = {'calm': 'a', 'fight': ['b', 'c']}
    s.start = 'intro'
    return s
