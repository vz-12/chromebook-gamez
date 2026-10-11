"""warden: THE WARDEN, the first wall (MUSIC-PLAN.md). Metal on the main theme, live drums, no
intro: it starts at full force on the boss-in sting's hit. 160 BPM, A minor.

  p1  16 bars  a half-time stomp: the riff alone for eight bars, then the theme over it
  p2  16 bars  full time, galloping: the theme's answer (F, G, A; F, G, E), harmonized second time
  p3  16 bars  the thrash beat, the theme in harmony, a choir rising through every A minor bar,
               double kicks under the last eight

The boss's three health-gated phases pick p1, p2, p3; the game moves on the next two-bar line.
Nearest reference: Guardian of The Former Seas (full force from bar one, short resets).
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, lowshelf, peak, drive, gate, clip
from inst import hit, synth, guitar, amp, clips, riser, reverse, boom
from scores._common import THEME, THEME_CH, ANSWER, ANSWER_CH, third, kit

TITLE = 'The First Wall'
ORDER = ['p1', 'p2', 'p3', 'p3']

# the riff, a bar a line: root:length in 16ths; * a power chord left to ring, plain a palm mute, r a rest
RIFF = ['A2*:2 A2:1 A2:1 r:1 A2:1 A2:1 A2:1 r:1 A2:1 A2:1 A2:1 C3*:2 D3*:2',
        'A2*:2 A2:1 A2:1 r:1 A2:1 A2:1 A2:1 G2*:3 A2*:5',
        'G2*:2 G2:1 G2:1 r:1 G2:1 G2:1 G2:1 r:1 G2:1 G2:1 G2:1 D3*:2 E3*:2',
        'C3*:4 D3*:4 E3*:4 E2:1 E2:1 E2:1 E2:1',
        'A2*:2 A2:1 A2:1 r:1 A2:1 A2:1 A2:1 r:1 A2:1 A2:1 A2:1 C3*:2 D3*:2',
        'A2*:2 A2:1 A2:1 r:1 A2:1 A2:1 A2:1 G2*:3 A2*:5',
        'F2*:2 F2:1 F2:1 r:1 F2:1 F2:1 F2:1 r:1 F2:1 F2:1 F2:1 F2*:2 G2*:2',
        'G2*:6 G2:1 G2:1 E3*:2 E3*:2 E2:1 E2:1 E2:1 E2:1']
ROOT = {'Am': 'A2', 'G': 'G2', 'C': 'C3', 'F': 'F2', 'E': 'E2'}

def song():
    K = kit()
    s = Song('warden', 160, target=-10.0, ceil=-1.5, room=dict(decay=1.6, pre=0.012, bright=6000.0, dark=1700.0),
             master=lambda x: highshelf(hp(x, 32.0), 8500.0, -2.0))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.55, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.55, rev=0.14, fx=[lambda x: clip(x, 0.7)]))
    s.add('hat', Bus(hit(K['hats'], human=0.003), gain=0.3, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.2, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.22, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.18, fx=[lambda x: clip(x, 0.7)]))
    s.add('gtr', Bus(guitar(K['chugs'], K['chords'], wide=0.72), gain=0.56, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.06, spread=0.0, sub=0.5, sq=0.45, cutoff=520.0, env=2.5, fdecay=0.09,
                            res=1.0, track=0.3, a=0.003, d=0.09, s=0.8, r=0.04, dirt=0.7),
                      gain=0.3, duck=0.35, fx=[lambda x: hp(x, 40.0)]))
    s.add('lead', Bus(synth('saw', voices=2, detune=0.09, spread=0.3, sq=0.45, cutoff=3000.0, env=1.5, fdecay=0.2, res=1.3,
                            a=0.005, d=0.2, s=0.85, r=0.12, vib=0.16, dirt=0.55),
                      gain=0.19, dly=0.25, rev=0.22, fx=[lambda x: peak(hp(x, 250.0), 1800.0, 2.0, 1.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, cutoff=1500.0, track=0.2, a=0.05, d=0.4, s=0.9, r=0.3),
                     gain=0.14, rev=0.4, duck=0.3, fx=[lambda x: hp(x, 200.0)]))
    one_bar = s.bar
    s.add('fx', Bus(clips({'boom': boom(), 'short': riser(s.bar, lo=600.0), 'rev': reverse(K['crash'], 1.4),
                           'choir': gate(K['choir'], one_bar * 0.97, 0.25), 'brass': K['brass']}), gain=1.0, rev=0.3))

    def riff(sec, bar, text, bass=True):
        step = 0.0
        for tok in text.split():
            name, _, d = tok.partition(':'); d = float(d)
            if name != 'r':
                ring = name.endswith('*'); p = midi(name.rstrip('*'))
                sec.note('gtr', bar, step, d, p, 1.0 if ring else 0.85, kind='chord' if ring else 'chug')
                if bass:
                    b = p - 12 if p > midi('E2') else p        # under the guitars, never under E1
                    sec.note('bass', bar, step, min(d, 2.0) * (0.95 if ring else 0.8), b, 1.0 if ring else 0.8)
            step += d
    def gallop(sec, bar, root, heavy=False):
        """Eighth and two sixteenths, four times: a chord on beats 1 and 3, mutes between."""
        text = ' '.join(f'{root}*:2 {root}:1 {root}:1 {root}:2 {root}:1 {root}:1' for _ in range(2))
        riff(sec, bar, text)
    def trem(sec, bar, root):
        """Sixteenths all the way, a chord at the top of each beat."""
        riff(sec, bar, ' '.join(f'{root}*:1 {root}:1 {root}:1 {root}:1' for _ in range(4)))
    def fill(sec, bar, at=12):
        for i, semi in enumerate([7, 7, 2, -5][:16 - at]): sec.note('tom', bar, at + i, 1, 60, 0.8 + 0.06 * i, semi=semi)
    def choir(sec, bar, v=0.5): sec.note('fx', bar, 0, 16, 60, v, s='choir')

    # ---- p1: the wall. Half time; the riff alone, then the theme over it
    a = s.section('p1', 16, seg=2)
    for b in range(16):
        riff(a, b, RIFF[b % 8])
        a.hits('kick', b, 'x.xx..xx..xx..x.' if b % 8 not in (3, 7) else 'x...x...x...xxxx')
        if b != 15: a.hits('snare', b, '........x.......' if b % 8 != 3 else '....x.......x...')
        a.hits('hat', b, 'x.o.x.o.x.o.x.o.', v=0.9)
        a.hits('china', b, 'x.......x.......' if b % 2 == 0 else '........x.......', v=0.8)
        if b >= 8:
            a.line('lead', b, THEME[b % 8], 1.0)
            a.chordn('pad', b, 0, 15.5, THEME_CH[b % 8], 3, 0.8)
    for b in (0, 8): a.note('crash', b, 0, 1, 60, 1.0); a.note('fx', b, 0, 1, 60, 0.3, s='boom')
    a.note('fx', 0, 0, 1, 60, 0.22, s='brass')
    a.note('crash', 4, 0, 1, 60, 0.7); a.note('crash', 12, 0, 1, 60, 0.7)
    fill(a, 7); fill(a, 15, 8); a.hits('snare', 15, '........x.x.xxxx', v=0.95)

    # ---- p2: full time, galloping; the answer
    p = s.section('p2', 16, seg=2)
    for b in range(16):
        sym = ANSWER_CH[b % 8]
        if b % 8 == 7: riff(p, b, 'E3*:2 E3*:2 E3*:2 E3*:2 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1 E2:1')
        else: gallop(p, b, ROOT[sym])
        p.hits('kick', b, 'x.xx.xxxx.xx.xxx')
        if b != 15: p.hits('snare', b, '....x.......x...')
        p.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.95)
        p.chordn('pad', b, 0, 15.5, sym, 3, 0.9)
        p.line('lead', b, ANSWER[b % 8], 1.0)
        if b >= 8: p.line('lead', b, third(ANSWER[b % 8]), 0.5)
    for b in range(0, 16, 4): p.note('crash', b, 0, 1, 60, 1.0 if b % 8 == 0 else 0.7)
    for b in range(2, 16, 4): p.note('china', b, 0, 1, 60, 0.8)
    p.note('fx', 0, 0, 1, 60, 0.3, s='boom'); p.note('fx', 8, 0, 1, 60, 0.2, s='boom')
    for b in (2, 3, 10, 11): choir(p, b, 0.4)
    fill(p, 7); fill(p, 15, 8); p.hits('snare', 15, '....x...x.x.xxxx', v=0.95); p.note('fx', 15, 0, 16, 60, 0.3, s='short')

    # ---- p3: everything. The thrash beat, the theme in harmony, the choir on every A minor bar
    q = s.section('p3', 16, seg=2)
    for b in range(16):
        sym = THEME_CH[b % 8]
        if b % 8 == 7: riff(q, b, 'G2*:3 G2*:3 G2*:2 E3*:3 E3*:3 E3*:2')
        else: trem(q, b, ROOT[sym])
        q.hits('kick', b, 'x...x...x...x...' if b < 8 else 'xxxxxxxxxxxxxxxx', v=1.0 if b < 8 else 0.88)
        if b != 15: q.hits('snare', b, '..x...x...x...x.' if b < 8 else '....x.......x...')
        q.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.9)
        q.hits('china', b, 'x...x...x...x...', v=0.7)
        q.chordn('pad', b, 0, 15.5, sym, 3, 1.0); q.note('pad', b, 0, 15.5, chord(sym, 4)[0], 0.8)
        q.line('lead', b, THEME[b % 8], 1.0); q.line('lead', b, third(THEME[b % 8]), 0.55)
        if b >= 8: q.line('lead', b, THEME[b % 8], 0.5, octave=-1)
        if sym == 'Am': choir(q, b, 0.5 if b < 8 else 0.6)
    for b in range(0, 16, 4): q.note('crash', b, 0, 1, 60, 1.0)
    q.note('fx', 0, 0, 1, 60, 0.32, s='boom'); q.note('fx', 8, 0, 1, 60, 0.26, s='boom'); q.note('fx', 0, 0, 1, 60, 0.2, s='brass')
    fill(q, 7, 8); fill(q, 15, 8); q.hits('snare', 15, 'x.x.x.x.xxxxxxxx', v=0.9)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    return s
