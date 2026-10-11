"""What every track shares (MUSIC-PLAN.md): the main theme, and the kit made from the raw recordings.

The theme grows from the first build's synth bed, whose bass went A, A, G, C under an A minor
pentatonic. Those four bars are its first half; the second half lifts through F and G back to A.
"""
import numpy as np
from daw import SR, sample, shift, gate, midi, lp, hp, peak, highshelf, st, fade
from inst import layer, synth_kick, noise

# the main theme, a bar a line, in 16ths: note:length (r is a rest)
THEME = ['A4:2 C5:2 E5:6 D5:2 C5:4',
         'D5:2 E5:2 A5:6 G5:2 E5:4',
         'D5:6 B4:2 D5:4 G5:4',
         'E5:6 G5:2 E5:4 C5:2 D5:2',
         'A4:2 C5:2 E5:6 D5:2 C5:4',
         'D5:2 E5:2 A5:6 C6:2 B5:4',
         'A5:6 F5:2 A5:4 C6:4',
         'B5:6 G5:2 D5:4 B4:4']
THEME_CH = ['Am', 'Am', 'G', 'C', 'Am', 'Am', 'F', 'G']
# its answer: a sequence climbing F, G to A, then F, G to the dominant, which falls back into the theme
ANSWER = ['C5:4 A4:2 C5:2 F5:6 E5:2',
          'D5:4 B4:2 D5:2 G5:6 F5:2',
          'E5:8 r:2 A4:2 C5:2 E5:2',
          'A5:8 G5:4 E5:4',
          'F5:4 A5:2 C6:2 A5:6 G5:2',
          'G5:4 B5:2 D6:2 B5:6 A5:2',
          'G#5:8 B5:4 E5:4',
          'E5:2 G#5:2 B5:2 E6:2 D6:2 B5:2 G#5:2 E5:2']
ANSWER_CH = ['F', 'G', 'Am', 'Am', 'F', 'G', 'E', 'E']

_THIRD = {9: 3, 11: 3, 0: 4, 2: 3, 4: 3, 5: 4, 7: 4, 8: 3}      # a third above, inside A minor
def third(text):
    """A melody line a third higher, staying in the key: the harmony part."""
    out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        if name == 'r': out.append(tok); continue
        m = midi(name)
        out.append(f'{int(m + _THIRD.get(int(m) % 12, 3))}:{d}')
    return ' '.join(out)

def hits_in(x, least=0.12):
    """A recording of one note struck several times, cut into its separate strikes."""
    import librosa
    on = librosa.onset.onset_detect(y=x.mean(axis=1).astype(np.float32), sr=SR, hop_length=256, backtrack=True, units='samples')
    on = [int(o) for o in on] or [0]
    if on[0] > int(0.03 * SR): on = [0] + on
    cuts = []
    for i, o in enumerate(on):
        end = on[i + 1] if i + 1 < len(on) else len(x)
        if end - o >= least * SR: cuts.append(fade(x[max(0, o - 96):end].copy(), 0.001, 0.008))
    return cuts or [x]

_KIT = {}
def kit():
    """The drums and guitars, cut and layered from the raw one-shots (once)."""
    if _KIT: return _KIT
    k = _KIT
    death, huge = sample('adt_kick_death'), sample('adt_kick_huge')
    click = fade(st(hp(noise(int(0.012 * SR), 2), 3000.0) * np.exp(-np.arange(int(0.012 * SR)) / (0.003 * SR))), 0.0002, 0.002)
    k['kick_e'] = layer((synth_kick(click=1.0), 1.0), (hp(lp(death, 2500.0), 120.0), 0.5))                       # electronic, for the sectors
    k['kick_m'] = layer((death, 1.0), (lp(huge, 140.0), 0.5), (click, 0.55))                 # metal: body and a click
    wave = gate(sample('MAGIC_SWORD_snare_one_shot_retro_reverb_80s_loud'), 0.36, 0.14)
    perfect, roomy = sample('adt_snare_perfect'), sample('adt_snare_roomshot_3')
    big = gate(sample('TS_STERLOID_snare_one_shot_ringy_bell_big_hard'), 0.45, 0.25)
    k['snare_w'] = layer((wave, 1.0), (perfect, 0.45))                                       # gated, 80s
    k['snare_m'] = layer((perfect, 1.0), (roomy, 0.5), (hp(big, 120.0), 0.4))                # live, with its room
    k['hats'] = [sample('adt_hat_closed_tight'), gate(sample('adt_hat_closed_crisp'), 0.1, 0.05)]
    k['ohat'] = sample('adt_hat_open_clean')
    k['crash'] = gate(sample('TS_PAUL_MABURY_cymbal_one_shot_19_crash_nat_m1'), 2.4, 1.3)
    k['china'] = gate(sample('TS_DC_GOGO_cymbal_dark_crash'), 1.8, 1.2)
    tom, floor = sample('TS_NIR_Z_JJ_tom_one_shot_modern_tom_2_hard'), sample('TS_STERLOID_tom_one_shot_deadwig_floor_big_med')
    k['tom_hi'] = gate(shift(tom, 7), 0.4, 0.2); k['tom_mid'] = gate(shift(tom, 2), 0.5, 0.25); k['tom_lo'] = gate(floor, 0.6, 0.3)
    # each chug recording is four palm mutes in a row: four takes of the same note
    k['chugs'] = {midi('D#2'): hits_in(sample('PHS1_6string_chug_04_Ds')), midi('F2'): hits_in(sample('PHS1_8string_chug_02_F')),
                  midi('G2'): hits_in(sample('PHS1_6string_chug_08_G')), midi('A#2'): hits_in(sample('PHS1_6string_chug_11_As'))}
    k['chords'] = {midi('A2'): sample('JOSH_J_electric_guitar_chords_power_A'), midi('D3'): sample('JOSH_J_electric_guitar_chords_power_D')}
    k['choir'] = sample('SO_SSW_vocal_choir_readyforwar_swell_A', trim=False)
    k['brass'] = sample('KSHMR_Brass_Suspense_Stab_D_E')
    k['sub1'] = sample('FF_TT_fx_boom_deep_tech_down'); k['sub2'] = sample('Soundiron_Shudder_Hits_Hard_Hit_13')
    return k
