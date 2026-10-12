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

_MINOR = [0, 2, 3, 5, 7, 8, 10]
def third(text, tonic='A'):
    """A melody line a third higher, staying in the (natural minor) key: the harmony part. A note from
    outside the key, the raised seventh, takes a minor third."""
    base = int(midi(tonic + '0')) % 12
    out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        if name == 'r': out.append(tok); continue
        m = midi(name); deg = (int(m) - base) % 12
        if deg in _MINOR:
            i = _MINOR.index(deg); up = (_MINOR[(i + 2) % 7] - deg) % 12
        else: up = 3 if (deg + 3) % 12 in _MINOR or (deg + 4) % 12 not in _MINOR else 4   # whichever third lands in the key
        out.append(f'{int(m + up)}:{d}')
    return ' '.join(out)

# ---- what the metal tracks share: a riff written out, and the usual figures
def riff(sec, bar, text, bass=True, gtr='gtr'):
    """A bar of rhythm guitar: root:length in 16ths; * a power chord left to ring, plain a palm mute,
    r a rest. The bass doubles it an octave down (never under E1)."""
    step = 0.0
    for tok in text.split():
        name, _, d = tok.partition(':'); d = float(d)
        if name != 'r':
            ring = name.endswith('*'); p = midi(name.rstrip('*'))
            sec.note(gtr, bar, step, d, p, 1.0 if ring else 0.85, kind='chord' if ring else 'chug')
            if bass:
                b = p - 12 if p > midi('E2') else p
                sec.note('bass', bar, step, min(d, 2.0) * (0.95 if ring else 0.8), b, 1.0 if ring else 0.8)
        step += d
def gallop(sec, bar, root):
    """Eighth and two sixteenths, four times: a chord on beats 1 and 3, mutes between."""
    riff(sec, bar, ' '.join(f'{root}*:2 {root}:1 {root}:1 {root}:2 {root}:1 {root}:1' for _ in range(2)))
def trem(sec, bar, root):
    """Sixteenths all the way, a chord at the top of each beat."""
    riff(sec, bar, ' '.join(f'{root}*:1 {root}:1 {root}:1 {root}:1' for _ in range(4)))
def hammer(sec, bar, root):
    """The machine: sixteenths with a chord on every 3 + 3 + 2 accent, twice a bar."""
    riff(sec, bar, ' '.join(f'{root}*:1 {root}:1 {root}:1 {root}*:1 {root}:1 {root}:1 {root}*:1 {root}:1' for _ in range(2)))
def tomfill(sec, bar, at=12, bus='tom'):
    for i, semi in enumerate([7, 7, 2, -5][:16 - at]): sec.note(bus, bar, at + i, 1, 60, 0.8 + 0.06 * i, semi=semi)

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

_FORGE = {}
def forge():
    """THE FOUNDRY's metal: anvils, hammer strikes, clangs, and the low brass (its roots as measured,
    since two of the recordings are not at the pitch their names say).

    Struck metal rings at a pitch, and here it rings in D minor. The anvil as recorded rings on F sharp,
    the one note that turns D minor major, so it is replayed four semitones lower: its ring lands on D
    and its body on F, and it sounds like a heavier anvil. The clang is moved up onto A, the hammer
    ticks down onto D, the stomp down onto C."""
    if _FORGE: return _FORGE
    f = _FORGE; K = kit()
    f['anvil'] = [gate(shift(a, -4.11), 0.34, 0.14) for a in hits_in(sample('SPLC_Blacksmith_Anvil_Heavy'), least=0.1)]
    ticks = hits_in(sample('ESM_Hammer_On_Metal_Seq_2', trim=False), least=0.05) + hits_in(sample('ESM_Hammer_On_Metal_Seq_4', trim=False), least=0.05)
    f['tick'] = [gate(shift(t / max(1e-9, float(np.abs(t).max())), -1.42), 0.07, 0.03) for t in ticks]
    f['clang'] = [gate(shift(c, 0.47), 0.8, 0.3) for c in hits_in(sample('EXA_Maine_Construction_Clangs'), least=0.5)]
    f['stomp'] = gate(shift(sample('Soundiron_BunkerStomp_10'), -1.25), 0.5, 0.3)
    f['bin'] = gate(sample('shs_oat_percussion_dumpster_4'), 0.22, 0.1)
    f['low'] = gate(shift(sample('shs_mtl_percussion_low_mid_Vanat'), 0.3), 1.4, 0.8)
    f['snare'] = layer((K['snare_m'], 0.8), (hp(f['bin'], 200.0), 0.55), (hp(f['anvil'][0], 500.0), 0.4))     # a snare with iron in it
    f['kick'] = layer((synth_kick(f0=150.0, f1=44.0, click=1.0, length=0.34), 1.0), (lp(f['stomp'], 260.0), 0.35), (hp(lp(sample('adt_kick_death'), 2500.0), 120.0), 0.4))
    # brass: short (a trombone's plod, B2, in tune) and long (a horn section on A2, 15 cents flat)
    f['stab'] = {47.0: sample('OS_trombone_plod_B')}
    f['horn'] = {44.85: sample('BOS_brass_horn_watched_A', trim=False)}
    f['braam'] = sample('PL_cimbassi_horn_E', trim=False)          # an F, whatever its name says: a low swell, 1.4 s to its peak
    f['howl'] = sample('MB_horn_howl_A', trim=False)               # a high A rising for 3.3 s
    return f

_HIVE = {}
def hive():
    """THE HIVE's sounds: things with too many legs. Recordings of a spider walking and of something
    scuttling are too high to carry on a laptop (they sit near 13 kHz), so they are replayed slower and
    lower, where they sound larger; the insect chatter and the moth are left as beds. The choir is two
    held notes (C, a shade flat, and E) and a C minor cluster dropped six semitones to F sharp minor,
    which makes it slow and enormous."""
    if _HIVE: return _HIVE
    h = _HIVE
    def norm(x): return x / max(1e-9, float(np.abs(x).max()))
    def cuts(x, parts):
        n = len(x) // parts
        return [fade(x[i * n:(i + 1) * n].copy(), 0.004, 0.03) for i in range(parts)]
    scut = norm(shift(sample('ESM_Creature_Scuttle_2'), -8.0))            # 1.3 s becomes 2 s: four bursts
    h['scut'] = cuts(scut[:int(1.9 * SR)], 4)
    spider = norm(shift(sample('BU_SpiderWalkMove', trim=False), -11.0))  # 1.6 s becomes 3 s of slow, heavy steps
    h['spider'] = cuts(spider, 3) + [fade(spider, 0.01, 0.1)]
    h['rattle'] = [norm(sample('BU_InsectRattleShake')), norm(shift(sample('BU_InsectRattleShake'), -7.0))]
    h['wings'] = [norm(sample('BU_InsectWingsMove_504', trim=False)), norm(sample('BU_InsectWingsMove_508', trim=False))]
    h['chit'] = [norm(sample('BW_AlienInsectVocal')), norm(sample('BU_InsectVoiceCry'))]
    h['swarm'] = fade(norm(sample('PHT_insects_08', trim=False)), 0.4, 0.6)                 # 5.3 s of chatter
    h['moth'] = fade(norm(sample('EX_BUG_death_moth_scraping', trim=False))[:int(7.4 * SR)], 0.5, 0.8)
    h['squish'] = norm(sample('BU_InsectSquish')); h['suck'] = norm(sample('BW_SquishSuction')); h['goo'] = norm(sample('ESM_Goo_Movement_12'))
    g = sample('RARE_guiro_stroke')
    h['guiro'] = fade(norm(g[:int(0.9 * SR)]), 0.002, 0.08)                # the scrape, whole
    h['ridge'] = [gate(norm(r), 0.05, 0.02) for r in hits_in(g, least=0.05)[:8]] or [gate(norm(g), 0.05, 0.02)]   # its ridges, one at a time
    h['cabasa'] = [gate(norm(sample('SS_cabasa_hit_endive')), 0.09, 0.04), gate(norm(sample('DIASPORA_cabasa_dancehall')), 0.09, 0.04)]
    h['swish'] = gate(norm(sample('RARE_cabasa_texture')), 0.3, 0.08)
    h['clave'] = [gate(norm(c), 0.12, 0.05) for c in hits_in(sample('TTS_perc_clav_B', trim=False), least=0.08)[:4]]
    h['choir'] = {59.85: sample('FL_Ghost_Choir_C'), 64.0: sample('FL_Ghost_Choir_E')}
    h['brood'] = shift(sample('FL_Ghost_Choir_Cm'), -6.0)                  # F sharp minor, with its ninth
    return h

_VAULT = {}
def vault():
    """THE VAULT's and THE ARCHIVIST's sounds: glass, clockwork and paper.

    Sung bowls on D and B (the D a touch sharp, the B a quarter-tone flat: their roots here are as
    measured), a plucked zither for the arpeggios, a kitchen timer's ticks and a lock's clicks for the
    time lock. For THE ARCHIVIST: a harpsichord (one long low C, and short notes cut out of two riffs
    for the upper octaves), a cello's staccato, pizzicato plucks cut the same way, string stabs, a
    kettledrum, and a typewriter: its keys for hats and its bell, moved down onto F sharp, to end a line."""
    if _VAULT: return _VAULT
    v = _VAULT
    def norm(x): return x / max(1e-9, float(np.abs(x).max()))
    def loud(cuts, within=9.0, most=8, secs=0.07):
        """The strikes worth having: those within `within` dB of the loudest, each cut short."""
        top = max(float(np.abs(c).max()) for c in cuts)
        keep = [c for c in cuts if float(np.abs(c).max()) > top * 10 ** (-within / 20)][:most]
        return [gate(norm(c), secs, 0.02) for c in keep]
    v['tick'] = loud(hits_in(sample('ESM_Kitchen_Timer_Tick_Tock_1', trim=False), least=0.1), most=6, secs=0.05)
    mech = hits_in(sample('ESM_mechanism_unlock_ding_01', trim=False), least=0.03)
    v['lock'] = loud([c for c in mech if len(c) < 0.2 * SR], most=8, secs=0.08)
    v['ding'] = fade(norm(max(mech, key=len)), 0.001, 0.3)
    v['ratchet'] = loud(hits_in(sample('BW_SnowGlobeWindUp', trim=False), least=0.03), within=6.0, most=8, secs=0.06)
    v['keys'] = loud(hits_in(sample('BW_Typewriter_997', trim=False), 0.04) + hits_in(sample('BW_Typewriter_1001', trim=False), 0.04),
                     within=8.0, most=10, secs=0.07)
    v['bell'] = shift(norm(sample('ESM_Typewriter_Bell_Carriage_Return')), -2.17)        # from G sharp (and a bit) down to F sharp
    v['bowl'] = {50.13: sample('GIO_bowl_medium_soft_D')}
    v['hbowl'] = {70.72: sample('GIO_bowl_small_gentle_B')}
    v['harp'] = {68.93: sample('GIO_harp_hit_normal_A'), 73.93: sample('GIO_harp_hit_regular_D')}
    hv = hits_in(sample('SNS_harpsichord_vibes_E', trim=False), 0.12); hc = hits_in(sample('SNS_harpsichord_cayenne_F', trim=False), 0.1)
    v['harpsi'] = {47.89: sample('DE_harpsichord_baroque_C'), 64.02: norm(hv[3]), 68.99: norm(hc[2]), 72.70: norm(hv[0])}
    v['cello'] = {46.8: norm(hits_in(sample('ESM_cello_staccato_alert_Bm', trim=False), 0.08)[3])}      # the B that ends its four-note figure
    pb = hits_in(sample('SO_MTS_pizz_blue_Cm', trim=False), 0.1); py = hits_in(sample('SO_MTS_pizz_yellow_Bb', trim=False), 0.08)
    v['pizz'] = {55.0: norm(py[2]), 57.0: norm(pb[0]), 58.0: norm(pb[1])}
    v['strike'] = {41.96: sample('KSHMR_string_stab_strike_Fs')}                           # F sharp in octaves, no third
    v['major'] = {50.0: sample('SO_TS_chord_staccato_D'), 52.0: sample('SO_TS_chord_staccato_E')}   # staccato major triads, by root
    v['timp'] = {36.37: sample('ge_hs_kettledrum'), 41.22: sample('TW_timpani_F')}       # a deep one on C, a brighter one on F: both a little sharp
    v['shatter'] = norm(sample('ESM_crystal_shatter_celestial_01'))
    v['tinkle'] = shift(norm(sample('ESM_crystal_tinkle_glitter_01')), -0.5)
    v['ice'] = shift(norm(sample('ESM_ice_icepick_sparkle_01')), -1.2)                     # its cluster moved into B minor
    v['book'] = norm(sample('BookHardcover_S08FO')); v['page'] = norm(sample('HardcoverBookPage_BW'))
    return v

# ---- a written line, changed
def move(text, semis):
    """A line moved into another key, every note `semis` higher (its notes come out as numbers)."""
    out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        if name == 'r': out.append(tok); continue
        acc = '!' if name.endswith('!') else ''
        out.append(f"{int(midi(name.rstrip('!')) + semis)}{acc}:{d or 1}")
    return ' '.join(out)
def slow(text, k=2):
    """The same line with every note k times as long: over k bars where it took one."""
    out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        out.append(f'{name}:{float(d or 1) * k:g}')
    return ' '.join(out)
def sing(sec, bus, bar, text, v=1.0, lo=62.0, hi=79.0):
    """A line on a recorded section that has one good octave: the whole line is moved by octaves until
    its top note is within reach, so it keeps its shape, and where the tune climbs past the section's
    top the section sings it an octave lower, as players would."""
    notes = [midi(tok.partition(':')[0].rstrip('!')) for tok in text.split() if not tok.startswith('r')]
    if not notes: return
    down = 0
    while max(notes) - down > hi: down += 12
    while min(notes) - down < lo - 12: down -= 12
    step = 0.0
    for tok in text.split():
        name, _, d = tok.partition(':'); d = float(d or 1)
        if name != 'r': sec.note(bus, bar, step, d, midi(name.rstrip('!')) - down, v)
        step += d
def legato(sec, bus, bar, text, v=1.0, octave=0, most=7.0, prev=None):
    """A line sung in one breath: each note bends in from the one before it (the synth's `glide`),
    unless that one was a rest or more than `most` semitones away. Returns its last pitch."""
    step = 0.0
    for tok in text.split():
        name, _, d = tok.partition(':'); d = float(d or 1)
        if name == 'r': prev = None
        else:
            acc = 1.25 if name.endswith('!') else 1.0
            p = midi(name.rstrip('!')) + 12 * octave
            kw = {'slide': prev - p} if prev is not None and prev != p and abs(prev - p) <= most else {}
            sec.note(bus, bar, step, d, p, v * acc, **kw); prev = p
        step += d
    return prev

_VOID = {}
def void():
    """THE VOID's and NULL's sounds: a piano in an empty room, strings, and the dark's own choir.

    The piano is an upright with its felt down, a quarter-tone flat all over (its roots here are as
    measured): one very low C, held for eighteen seconds, and two notes near the middle. The strings are
    a section playing D in octaves. The choir is the ghosts' (a C a third of a semitone flat, and an E).
    The kettledrum roll says C on its label and sounds an E with a minor third over it, so it is replayed
    lower, where that E is a C and the third is E flat. The men's swell is moved from A up to C."""
    if _VOID: return _VOID
    v = _VOID
    def norm(x): return x / max(1e-9, float(np.abs(x).max()))
    v['plow'] = {23.75: sample('SC_IP_piano_upright_note_held_low_C')}
    v['piano'] = {61.72: sample('SC_IP_piano_upright_note_asleep_middle_D'), 64.75: sample('SC_IP_piano_upright_note_asleep_high_F')}
    v['strings'] = {74.05: sample('SC_DS_strings_octave_hi_long_D')}
    v['choir'] = {59.66: sample('FL_Ghost_Choir_C'), 64.15: sample('FL_Ghost_Choir_E')}
    v['swell'] = norm(shift(sample('SO_SSW_vocal_choir_readyforwar_swell_A', trim=False), 3.05))
    v['roll'] = norm(shift(sample('HC_timpani_roll_C'), -4.32))
    v['timp'] = {36.37: sample('ge_hs_kettledrum'), 41.22: sample('TW_timpani_F')}
    v['horn'] = {44.85: sample('BOS_brass_horn_watched_A', trim=False)}
    v['stab'] = {47.0: sample('OS_trombone_plod_B')}
    v['whoosh'] = norm(sample('ESM_PG_magic_airy_whoosh_swell_03', trim=False))
    v['tinkle'] = shift(norm(sample('ESM_crystal_tinkle_glitter_01')), 0.5)        # its cluster moved into C minor
    v['ice'] = shift(norm(sample('ESM_ice_icepick_sparkle_01')), -0.2)
    v['shatter'] = norm(sample('ESM_crystal_shatter_celestial_01'))
    return v
