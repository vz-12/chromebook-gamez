"""forgeheart: FORGEHEART, THE FOUNDRY's boss (MUSIC-PLAN.md). Furnace metal: THE FOUNDRY's tune on
guitars, anvils struck with the snare, brass on the accents. No intro. 165 BPM, D minor.

  p1  16 bars  the forge at work, half time: chords on 3 + 3 + 2, an anvil on the back beat, brass
               marking each bar; the tune comes in at bar nine
  p2  16 bars  full time, galloping: the tune's answer, horns under it, a low brass swell through
               the F and B flat bars
  p3  16 bars  the machine at full speed: sixteenths with a chord, an anvil and a brass hit on every
               accent, the tune in harmony, a choir through the D minor bars, double kicks to finish

Nearest reference: Unholy Insurgency (the brightest and most percussive of the walls).
"""
from daw import Song, Bus, chord, midi, hp, lp, highshelf, peak, drive, gate, clip, shift
from inst import hit, synth, guitar, amp, sampler, clips, riser, reverse, boom, steam
from scores._common import third, kit, forge, riff, gallop, hammer, tomfill
from scores.foundry import TUNE, TUNE_CH, REPLY, REPLY_CH, GTR, ACC

TITLE = 'Struck While Hot'
ORDER = ['p1', 'p2', 'p3', 'p3']

def song():
    K = kit(); F = forge()
    s = Song('forgeheart', 165, target=-10.0, ceil=-1.5, room=dict(decay=1.6, pre=0.012, bright=6000.0, dark=1700.0),
             master=lambda x: highshelf(hp(x, 32.0), 8500.0, -2.0))
    s.add('kick', Bus(hit(K['kick_m']), gain=0.55, key=True, fx=[lambda x: clip(x, 0.7)]))
    s.add('snare', Bus(hit(K['snare_m']), gain=0.55, rev=0.14, fx=[lambda x: clip(x, 0.7)]))
    s.add('anvil', Bus(hit(F['anvil'], human=0.002), gain=0.6, rev=0.25, fx=[lambda x: hp(x, 250.0)]))
    s.add('tick', Bus(hit(F['tick'], human=0.003), gain=0.36, rev=0.08, fx=[lambda x: hp(x, 700.0)]))
    s.add('hat', Bus(hit(K['hats'], human=0.003), gain=0.3, fx=[lambda x: hp(x, 500.0)]))
    s.add('crash', Bus(hit(K['crash']), gain=0.3, rev=0.2, fx=[lambda x: hp(x, 300.0)]))
    s.add('china', Bus(hit(K['china']), gain=0.22, rev=0.15, fx=[lambda x: hp(x, 400.0)]))
    s.add('tom', Bus(hit(K['tom_mid']), gain=0.6, rev=0.18, fx=[lambda x: clip(x, 0.7)]))
    s.add('gtr', Bus(guitar(K['chugs'], K['chords'], wide=0.6), gain=0.56, rev=0.06, duck=0.12, fx=[amp, lambda x: clip(x, 0.9)]))
    s.add('bass', Bus(synth('saw', voices=2, detune=0.06, spread=0.0, sq=0.45, cutoff=520.0, env=2.5, fdecay=0.09,
                            res=1.0, track=0.3, a=0.003, d=0.09, s=0.8, r=0.04, dirt=0.8),
                      gain=0.3, duck=0.35, fx=[lambda x: peak(hp(x, 40.0), 700.0, 2.5, 1.0)]))
    s.add('lead', Bus(synth('saw', voices=2, detune=0.09, spread=0.3, sq=0.45, cutoff=3000.0, env=1.5, fdecay=0.2, res=1.3,
                            a=0.005, d=0.2, s=0.85, r=0.12, vib=0.16, dirt=0.55),
                      gain=0.19, dly=0.25, rev=0.22, fx=[lambda x: peak(hp(x, 250.0), 1800.0, 2.0, 1.0)]))
    s.add('pad', Bus(synth('saw', voices=7, detune=0.2, spread=1.0, cutoff=1500.0, track=0.2, a=0.05, d=0.4, s=0.9, r=0.3),
                     gain=0.14, rev=0.4, duck=0.3, fx=[lambda x: hp(x, 200.0)]))
    s.add('stab', Bus(sampler(F['stab'], rel=0.06), gain=0.85, rev=0.25, fx=[lambda x: hp(x, 120.0)]))
    s.add('horn', Bus(sampler(F['horn'], rel=0.2), gain=0.6, rev=0.3, duck=0.2, fx=[lambda x: hp(x, 90.0)]))
    s.add('braam', Bus(sampler({29.0: F['braam']}, rel=0.3), gain=0.5, rev=0.3, fx=[lambda x: hp(x, 45.0)]))
    s.add('fx', Bus(clips({'boom': boom(), 'short': riser(s.bar, lo=600.0), 'rev': reverse(K['crash'], 1.4),
                           'choir': gate(shift(K['choir'], -7.0), s.bar * 0.97, 0.25), 'clang': F['clang'][0], 'steam': steam(0.35)}),
                    gain=1.0, rev=0.3))

    def near(sym, centre):
        p = midi(GTR[sym]) % 12
        return min((p + 12 * o for o in range(2, 6)), key=lambda m: (abs(m - centre), m))
    def brass(sec, bar, sym, at, v=1.0, dur=1.6):
        r = near(sym, 47.0)
        for st_ in at:
            sec.note('stab', bar, st_, dur, r, v); sec.note('stab', bar, st_, dur, r - 5, v * 0.7)   # the fifth, below: brass pushed far up is a toy
    def choir(sec, bar, v=0.5): sec.note('fx', bar, 0, 16, 60, v, s='choir')

    # ---- p1: the forge at work, half time
    a = s.section('p1', 16, seg=2)
    for b in range(16):
        sym = TUNE_CH[b % 8]; g = GTR[sym]
        riff(a, b, f'{g}*:3 {g}*:3 {g}:1 {g}:1 {g}*:3 {g}*:3 {g}:1 {g}:1')
        a.hits('kick', b, 'x..x..x....x..x.' if b % 8 not in (3, 7) else 'x..x..x....xxxxx')
        if b != 15: a.hits('snare', b, '........x.......')
        a.hits('anvil', b, '........x.....o.', v=1.0)
        a.hits('tick', b, 'x.x.x.x.x.x.x.x.', v=0.8)
        a.hits('china', b, 'x.......x.......' if b % 2 == 0 else '........x.......', v=0.8)
        brass(a, b, sym, (0, 3) if b < 8 else (0,), 0.8)
        if b >= 8:
            a.line('lead', b, TUNE[b % 8], 1.0)
            a.chordn('pad', b, 0, 15.5, sym, 3, 0.8)
    for b in (0, 8): a.note('crash', b, 0, 1, 60, 1.0); a.note('fx', b, 0, 1, 60, 0.28, s='boom'); a.note('fx', b, 0, 1, 60, 0.2, s='clang')
    a.note('crash', 4, 0, 1, 60, 0.7); a.note('crash', 12, 0, 1, 60, 0.7)
    for b in (3, 11): a.note('fx', b, 14, 2, 60, 0.25, s='steam')
    tomfill(a, 7); tomfill(a, 15, 8); a.hits('snare', 15, '........x.x.xxxx', v=0.95)

    # ---- p2: full time, galloping; the answer
    p = s.section('p2', 16, seg=2)
    for b in range(16):
        sym = REPLY_CH[b % 8]
        if b % 8 == 7: riff(p, b, 'A2*:2 A2*:2 A2*:2 A2*:2 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1 A2:1')
        else: gallop(p, b, GTR[sym])
        p.hits('kick', b, 'x.xx.xxxx.xx.xxx')
        if b != 15: p.hits('snare', b, '....x.......x...')
        p.hits('anvil', b, '....x.......x...', v=0.85)
        p.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.95)
        p.chordn('pad', b, 0, 15.5, sym, 3, 0.9)
        p.note('horn', b, 0, 14, near(sym, 45.0), 0.8); p.note('horn', b, 0, 14, near(sym, 45.0) - 5, 0.55)
        if sym == 'F': p.note('braam', b, 0, 15, 29, 0.9)
        if sym == 'Bb': p.note('braam', b, 0, 15, 34, 0.9)
        p.line('lead', b, REPLY[b % 8], 1.0)
        if b >= 8: p.line('lead', b, third(REPLY[b % 8], 'D'), 0.5)
    for b in range(0, 16, 4): p.note('crash', b, 0, 1, 60, 1.0 if b % 8 == 0 else 0.7)
    for b in range(2, 16, 4): p.note('china', b, 0, 1, 60, 0.8)
    p.note('fx', 0, 0, 1, 60, 0.28, s='boom'); p.note('fx', 8, 0, 1, 60, 0.2, s='boom')
    tomfill(p, 7); tomfill(p, 15, 8); p.hits('snare', 15, '....x...x.x.xxxx', v=0.95); p.note('fx', 15, 0, 16, 60, 0.3, s='short')

    # ---- p3: the machine at full speed
    q = s.section('p3', 16, seg=2)
    for b in range(16):
        sym = TUNE_CH[b % 8]
        hammer(q, b, GTR[sym])
        q.hits('kick', b, 'x..x..x.x..x..x.' if b < 8 else 'xxxxxxxxxxxxxxxx', v=1.0 if b < 8 else 0.88)
        if b != 15: q.hits('snare', b, '....x.......x...')
        for at in ACC: q.note('anvil', b, at, 1, 60, 0.9 if at in (0, 8) else 0.7)
        q.hits('hat', b, 'x.x.x.x.x.x.x.x.', v=0.9)
        q.hits('china', b, 'x...x...x...x...', v=0.65)
        brass(q, b, sym, ACC, 0.75, 1.4)
        q.chordn('pad', b, 0, 15.5, sym, 3, 1.0); q.note('pad', b, 0, 15.5, chord(sym, 4)[0], 0.8)
        q.line('lead', b, TUNE[b % 8], 1.0); q.line('lead', b, third(TUNE[b % 8], 'D'), 0.55)
        if b >= 8: q.line('lead', b, TUNE[b % 8], 0.5, octave=-1)
        if sym == 'Dm': choir(q, b, 0.5 if b < 8 else 0.6)
    for b in range(0, 16, 4): q.note('crash', b, 0, 1, 60, 1.0)
    q.note('fx', 0, 0, 1, 60, 0.3, s='boom'); q.note('fx', 8, 0, 1, 60, 0.24, s='boom'); q.note('fx', 0, 0, 1, 60, 0.2, s='clang')
    tomfill(q, 7, 8); tomfill(q, 15, 8); q.hits('snare', 15, 'x.x.x.x.xxxxxxxx', v=0.9)

    s.moods = {'p1': 'p1', 'p2': 'p2', 'p3': 'p3'}
    return s
