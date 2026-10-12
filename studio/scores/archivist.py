"""archivist: THE ARCHIVIST, THE VAULT's boss (MUSIC-PLAN.md). Baroque, and breaking: a harpsichord
subject that walks down the circle of fifths in B minor (Bm, Em, A, D, G, C sharp diminished, F sharp,
Bm), staccato strings on the beats, a typewriter for hi-hats whose bell ends every fourth bar, a
kettledrum on the corners, and a record that skips. 170 BPM, B minor.

  intro  4 bars, once   the room before anyone speaks: a page, one low string, a few keys of the
               typewriter finding the beat, then the subject's bones (two notes a bar) over the cello,
               to the dominant and the bell. Without it the subject arrived all at once, and read as noise
  p1  16 bars  the reading room: the subject on the harpsichord over a cello's staccato and a half-time
               beat; pizzicato and the bass come in at bar nine
  p2  16 bars  the two-step: the harpsichord runs in sixteenths while the strings sing the subject at
               half speed, harmonized second time round
  p3  16 bars  everything filed at once: a broken beat, guitars, the subject in octaves and thirds with
               a damaged copy of itself a sixteenth behind, and the last beat of every fourth bar stuck

Nearest reference: Threats of The Ocean Floor (the fastest of the set).
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, clip, gate, crush
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom
from scores._common import third, kit, vault, tomfill

TITLE = 'Filed Under Lost'
ORDER = ['intro', 'p1', 'p2', 'p3', 'p3']

CH = ['Bm', 'Em', 'A', 'D', 'G', 'C#dim', 'F#', 'Bm']
# the subject: every bar the same shape a step lower. Down four notes from the chord's fifth, a turn, up its arpeggio
SUBJECT = ['F#5:2 E5:1 D5:1 C#5:2 D5:2 B4:2 D5:2 F#5:2 B5:2',
           'G5:2 F#5:1 E5:1 D5:2 E5:2 B4:2 E5:2 G5:2 B5:2',
           'E5:2 D5:1 C#5:1 B4:2 C#5:2 A4:2 C#5:2 E5:2 A5:2',
           'F#5:2 E5:1 D5:1 C#5:2 D5:2 A4:2 D5:2 F#5:2 A5:2',
           'D5:2 C#5:1 B4:1 A4:2 B4:2 G4:2 B4:2 D5:2 G5:2',
           'E5:2 D5:1 C#5:1 B4:2 C#5:2 G4:2 C#5:2 E5:2 G5:2',
           'C#5:2 B4:1 A#4:1 G#4:2 A#4:2 F#4:2 A#4:2 C#5:2 F#5:2',
           'D5:2 C#5:1 B4:1 A#4:2 B4:6 r:2 F#5:2']
# the same subject at half speed: two notes a bar, the ones the fast version leans on
LONG = ['F#5:8 D5:8', 'G5:8 E5:8', 'E5:8 C#5:8', 'F#5:8 D5:8', 'D5:8 B4:8', 'E5:8 C#5:8', 'C#5:8 A#4:8', 'B4:16']
LOW = {'Bm': 'B2', 'Em': 'E3', 'A': 'A2', 'D': 'D3', 'G': 'G2', 'C#dim': 'C#3', 'F#': 'F#2'}
MAJOR = ('A', 'D', 'G', 'F#')

def song():
    K = kit(); V = vault()
    s = Song('archivist', 170, target=-10.0, ceil=-1.5, room=dict(decay=1.5, pre=0.012, bright=6500.0, dark=1800.0),
             master=lambda x: highshelf(hp(x, 32.0), 9000.0, -1.5))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.72, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.55, rev=0.12, fx=[lambda x: clip(x, 0.7)]))
    s.add('keys', Bus(hit(V['keys'], human=0.002), gain=0.5, rev=0.08, fx=[lambda x: hp(x, 900.0)]))
    s.add('hat', Bus(hit(K['hats'], human=0.002), gain=0.26, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.2, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.2, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.18, fx=[lambda x: clip(x, 0.7)]))
    s.add('timp', Bus(sampler(V['timp'], rel=0.4), gain=0.6, rev=0.22, fx=[lambda x: clip(x, 0.8)]))
    s.add('harpsi', Bus(sampler(V['harpsi'], rel=0.1), gain=0.38, rev=0.16, dly=0.08, fx=[lambda x: hp(x, 180.0)]))
    s.add('quill', Bus(synth('square', pw=0.12, cutoff=5200.0, env=0.6, fdecay=0.05, res=0.8, track=0.5, a=0.001, d=0.3, s=0.0, r=0.08),
                       gain=0.22, rev=0.16, dly=0.08, fx=[lambda x: hp(x, 400.0)]))
    s.add('skip', Bus(synth('square', pw=0.2, cutoff=4200.0, env=0.6, fdecay=0.05, a=0.001, d=0.2, s=0.0, r=0.05),
                      gain=0.2, rev=0.1, fx=[lambda x: hp(crush(x, 5, 9), 500.0)]))
    s.add('cello', Bus(sampler(V['cello'], rel=0.06), gain=0.5, rev=0.14, duck=0.15, fx=[lambda x: hp(x, 70.0)]))
    s.add('pizz', Bus(sampler(V['pizz'], rel=0.1), gain=0.45, rev=0.22, fx=[lambda x: hp(x, 150.0)]))
    s.add('strike', Bus(sampler(V['strike'], rel=0.12), gain=0.5, rev=0.2, duck=0.1, fx=[lambda x: hp(x, 60.0)]))
    s.add('triad', Bus(sampler(V['major'], rel=0.12), gain=0.42, rev=0.2, fx=[lambda x: hp(x, 100.0)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.14, spread=0.0, sq=0.35, cutoff=480.0, env=2.4, fdecay=0.1, res=1.0, track=0.3,
                            a=0.003, d=0.1, s=0.8, r=0.04, dirt=0.75),
                      gain=0.24, duck=0.4, fx=[lambda x: peak(hp(x, 40.0), 700.0, 2.5, 1.0)]))
    s.add('lead', Bus(synth('saw', voices=4, detune=0.12, spread=0.6, sq=0.2, cutoff=3200.0, env=0.8, fdecay=0.25, res=1.0,
                            a=0.02, d=0.2, s=0.9, r=0.14, vib=0.14, dirt=0.25),
                      gain=0.22, dly=0.2, rev=0.26, fx=[lambda x: peak(hp(x, 250.0), 2000.0, 1.5, 1.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.18, spread=1.0, cutoff=2000.0, track=0.2, a=0.06, d=0.4, s=0.9, r=0.25),
                     gain=0.12, rev=0.35, duck=0.3, fx=[lambda x: hp(x, 220.0)]))
    s.add('gtr', Bus(guitar(K['chugs'], K['chords'], wide=0.6), gain=0.4, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('fx', Bus(clips({'boom': boom(), 'short': riser(s.bar, lo=600.0), 'rev': reverse(K['crash'], 1.4), 'bell': V['bell'],
                           'book': gate(V['book'], 0.6, 0.2), 'page': V['page'], 'shatter': V['shatter'], 'tinkle': V['tinkle']}),
                    gain=1.0, rev=0.25, fx=[lambda x: clip(x, 0.8)]))

    def line(sec, bar, text, v=1.0):
        """The harpsichord: the recording an octave under what is written (its short notes live there),
        a thin quill of a synth on the written notes, so the two make one bright instrument."""
        sec.line('harpsi', bar, text, v, octave=-1); sec.line('quill', bar, text, v)
    def left(sec, bar, sym, v=0.85):
        """The left hand: the root in eighths, on the harpsichord's one long string and the cello."""
        r = midi(LOW[sym])
        for i in range(8):
            p = r + (7 if i in (3, 7) and sym != 'C#dim' else 0)
            sec.note('harpsi', bar, i * 2, 1.6, p, v * (1.0 if i % 2 == 0 else 0.8))
            sec.note('cello', bar, i * 2, 1.2, p if p <= 52 else p - 12, v * (1.0 if i % 4 == 0 else 0.75))
    def stab(sec, bar, sym, at, v=1.0):
        """Strings on the chord: a recorded major triad where the chord is major, bare octaves where it is not."""
        r = midi(LOW[sym])
        for st_ in at:
            if sym in MAJOR:
                m = r % 12 + 48
                sec.note('triad', bar, st_, 1.8, m if m <= 55 else m - 12, v)
            else:
                sec.note('strike', bar, st_, 1.8, r % 12 + 36, v); sec.note('pizz', bar, st_, 1.5, chord(sym, 3)[1], v * 0.8)
    def alberti(sec, bar, sym, v=0.8):
        """The running hand: low, high, middle, high, in sixteenths."""
        tones = []
        for m in chord(sym, 4):
            while m > 71: m -= 12
            tones.append(m)
        tones.sort()
        for i in range(16):
            p = tones[[0, 2, 1, 2][i % 4]]
            sec.note('harpsi', bar, i, 0.9, p, v * (1.0 if i % 4 == 0 else 0.75)); sec.note('quill', bar, i, 0.9, p + 12, v * 0.7)
    def stuck(sec, bar, p, at=12, v=0.9):
        """The record skipping: one note, eight times in a beat."""
        for i in range(8):
            for bus, o in (('harpsi', -12), ('quill', 0), ('skip', 0)): sec.note(bus, bar, at + i * 0.5, 0.45, midi(p) + o, v * (1.0 - 0.07 * i))
    def typing(sec, bar, v=0.85, pattern='xoxoxoxoxoxoxoxo'): sec.hits('keys', bar, pattern, v=v)
    def ding(sec, bar, v=0.4): sec.note('fx', bar, 9, 6, 60, v, s='bell')
    def timp(sec, bar, sym, at=(0,), v=0.85):
        for st_ in at: sec.note('timp', bar, st_, 4, midi(LOW[sym]) % 12 + 36, v)

    # ---- intro: the room before anyone speaks. The key, the pulse, then the subject's bones
    n = s.section('intro', 4, seg=2, loop=False, next='p1', lock=True)
    n.note('fx', 0, 0, 4, 60, 0.4, s='page'); n.note('fx', 0, 0, 1, 60, 0.14, s='boom'); timp(n, 0, 'Bm', (0,), 0.6)
    n.note('harpsi', 0, 0, 14, midi('B2'), 0.9); n.note('harpsi', 1, 0, 6, midi('B2'), 0.75)
    for b, pattern in enumerate(['x.....x...x.x...', 'x.x...x.x.xxx.x.', 'xoxoxoxoxoxoxoxo', 'xoxoxoxoxoxoxoxo']): n.hits('keys', b, pattern, v=0.6 + 0.08 * b)
    for at in (0, 8): n.note('cello', 0, at, 1.2, midi('B2'), 0.7)
    for at in (0, 4, 8, 12): n.note('cello', 1, at, 1.2, midi('B2'), 0.75 if at % 8 else 0.9)
    for b, sym, text in [(1, 'Bm', LONG[0]), (2, 'Em', LONG[1]), (3, 'F#', LONG[6])]:
        line(n, b, text, 0.9)
        for at in (2, 6, 10, 14): n.note('pizz', b, at, 1.5, chord(sym, 3)[1] + (12 if chord(sym, 3)[1] < 55 else 0), 0.6)
    for b, sym in [(2, 'Em'), (3, 'F#')]:
        left(n, b, sym, 0.75 if b == 2 else 0.88); n.chordn('pad', b, 0, 15.5, sym, 4, 0.7)
        n.hits('kick', b, 'x.......x.......', v=0.85); stab(n, b, sym, (0,) if b == 2 else (0, 8), 0.7)
        timp(n, b, sym, (0,), 0.7)
    ding(n, 3); n.hits('snare', 3, '............x.xx', v=0.9); tomfill(n, 3, 12)
    n.note('fx', 3, 0, 16, 60, 0.18, s='short'); n.note('fx', 3, 15.99, 1, 60, 0.3, s='rev', lead=1.4 - 0.01 * s.step)

    # ---- p1: the reading room. The subject, a cello, a typewriter
    a = s.section('p1', 16, seg=2)
    for b in range(16):
        sym = CH[b % 8]
        line(a, b, SUBJECT[b % 8], 1.0); left(a, b, sym, 0.8 if b < 8 else 0.9)
        a.hits('kick', b, 'x.........x.....' if b % 2 == 0 else 'x.....x...x.....')
        if b != 15: a.hits('snare', b, '........x.......')
        typing(a, b, 0.8)
        stab(a, b, sym, (0, 8), 0.75 if b < 8 else 0.9)
        if b >= 8:
            a.chordn('pad', b, 0, 15.5, sym, 4, 0.8)
            for i in range(8): a.note('bass', b, i * 2, 1.6, midi(LOW[sym]) - 12 if midi(LOW[sym]) > 45 else midi(LOW[sym]), 0.9 if i % 2 == 0 else 0.75)
            for at in (2, 6, 10, 14): a.note('pizz', b, at, 1.5, chord(sym, 3)[1] + (12 if chord(sym, 3)[1] < 55 else 0), 0.7)
        if b % 4 == 3: ding(a, b)
    for b in (0, 8): a.note('crash', b, 0, 1, 60, 1.0); a.note('fx', b, 0, 1, 60, 0.24, s='boom'); a.note('fx', b, 0, 1, 60, 0.5, s='book'); timp(a, b, 'Bm')
    a.note('fx', 4, 0, 4, 60, 0.4, s='page'); a.note('fx', 12, 0, 4, 60, 0.4, s='page')
    stuck(a, 7, 'F#5', 12); tomfill(a, 15, 8); a.hits('snare', 15, '........x.x.xxxx', v=0.95)

    # ---- p2: the two-step. The harpsichord runs; the strings sing the subject at half speed
    p = s.section('p2', 16, seg=2)
    for b in range(16):
        sym = CH[b % 8]
        alberti(p, b, sym, 0.85); p.line('lead', b, LONG[b % 8], 1.0)
        if b >= 8: p.line('lead', b, third(LONG[b % 8], 'B'), 0.55)
        p.hits('kick', b, 'x.........x.....' if b % 2 == 0 else 'x......x..x.....')
        if b != 15: p.hits('snare', b, '....x..-....x..-')
        typing(p, b, 0.9); p.hits('hat', b, '..x...x...x...x.', v=0.8)
        stab(p, b, sym, (0, 6, 12), 0.8)
        p.chordn('pad', b, 0, 15.5, sym, 4, 0.9)
        r = midi(LOW[sym]); r = r - 12 if r > 45 else r
        for i in range(8): p.note('bass', b, i * 2, 1.6, r + (12 if i == 7 else 0), 1.0 if i % 2 == 0 else 0.8)
        if b % 2 == 0: timp(p, b, sym, (0,), 0.8)
        if b % 4 == 3: ding(p, b)
    for b in range(0, 16, 4): p.note('crash', b, 0, 1, 60, 1.0 if b % 8 == 0 else 0.7)
    p.note('fx', 0, 0, 1, 60, 0.22, s='boom'); p.note('fx', 0, 0, 1, 60, 0.45, s='book'); p.note('fx', 8, 0, 1, 60, 0.3, s='tinkle')
    stuck(p, 7, 'B4', 12, 0.8); tomfill(p, 15, 8); p.hits('snare', 15, '....x...x.x.xxxx', v=0.95); p.note('fx', 15, 0, 16, 60, 0.24, s='short')

    # ---- p3: everything filed at once
    q = s.section('p3', 16, seg=2)
    for b in range(16):
        sym = CH[b % 8]; g = LOW[sym] if sym != 'C#dim' else 'A2'      # under the diminished chord the guitars play A: together, an A seventh
        if b % 4 != 3: line(q, b, SUBJECT[b % 8], 1.0)
        else:                                            # the fourth bar plays three beats, then sticks
            toks = SUBJECT[b % 8].split()[:6]; line(q, b, ' '.join(toks), 1.0)
            stuck(q, b, [t.partition(':')[0] for t in toks if not t.startswith('r')][-1], 12, 0.95)
        q.line('lead', b, SUBJECT[b % 8], 0.85, octave=0); q.line('lead', b, third(SUBJECT[b % 8], 'B'), 0.5)
        for at, tok in zip(_starts(SUBJECT[b % 8]), SUBJECT[b % 8].split()):       # the damaged copy, a sixteenth late
            name, _, d = tok.partition(':')
            if name != 'r' and at + 1 < 16: q.note('skip', b, at + 1, float(d) * 0.6, midi(name), 0.8)
        left(q, b, sym, 0.9)
        for i in range(8): q.note('gtr', b, i * 2, 2, midi(g), 1.0 if i % 4 == 0 else 0.85, kind='chord' if i % 4 == 0 else 'chug')
        r = midi(LOW[sym]); r = r - 12 if r > 45 else r
        for i in range(16): q.note('bass', b, i, 0.9, r + (12 if i % 4 == 2 else 0), 1.0 if i % 4 == 0 else 0.8)
        q.hits('kick', b, 'x.....x...x..x..' if b < 8 else 'x.x...x.x.x..xx.')
        if b != 15: q.hits('snare', b, '....x..x.x..x...' if b % 2 == 0 else '....x.....x.x..-')
        typing(q, b, 0.95); q.hits('china', b, 'x...x...x...x...', v=0.6)
        stab(q, b, sym, (0, 4, 8, 12), 0.85); timp(q, b, sym, (0, 8), 0.85)
        q.chordn('pad', b, 0, 15.5, sym, 4, 1.0)
        if b % 4 == 3: ding(q, b, 0.45)
    for b in range(0, 16, 4): q.note('crash', b, 0, 1, 60, 1.0)
    q.note('fx', 0, 0, 1, 60, 0.26, s='boom'); q.note('fx', 0, 0, 1, 60, 0.5, s='book'); q.note('fx', 8, 0, 1, 60, 0.3, s='shatter'); q.note('fx', 8, 0, 1, 60, 0.2, s='boom')
    tomfill(q, 15, 8); q.hits('snare', 15, 'x.x.x.x.xxxxxxxx', v=0.9)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    s.start = 'intro'
    return s

def _starts(text):
    """Where each note of a written line begins, in 16ths."""
    at, out = 0.0, []
    for tok in text.split():
        out.append(at); at += float(tok.partition(':')[2] or 1)
    return out
