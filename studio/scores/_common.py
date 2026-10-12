"""What every track shares (MUSIC-PLAN.md): the main theme, and the kit made from the raw recordings.

The theme grows from the first build's synth bed, whose bass went A, A, G, C under an A minor
pentatonic. Those four bars are its first half; the second half lifts through F and G back to A.
"""
import math
import numpy as np
from daw import SR, Ev, sample, shift, gate, midi, lp, hp, peak, highshelf, st, fade, add
from inst import layer, synth_kick, noise, sampler, tapestop

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
    v['cello'] = {46.8: norm(hits_in(sample('ESM_cello_staccato_alert_Bm', trim=False), 0.08)[3])}      # NOT one note: the figure's last hit is a chord, B with D sharp, F sharp and G sharp (heard 12 Oct). A major sixth on whatever root it is moved to
    pb = hits_in(sample('SO_MTS_pizz_blue_Cm', trim=False), 0.1); py = hits_in(sample('SO_MTS_pizz_yellow_Bb', trim=False), 0.08)
    v['pizz'] = {55.0: norm(py[2]), 57.0: norm(pb[0]), 58.0: norm(pb[1])}
    v['strike'] = {41.96: sample('KSHMR_string_stab_strike_Fs')}                           # an F sharp MINOR chord (its A is 7 to 12 dB under the F sharps): for minor chords only
    v['major'] = {50.0: sample('SO_TS_chord_staccato_D'), 52.0: sample('SO_TS_chord_staccato_E')}   # staccato major chords: the D is a clean triad; the E carries a D sharp (a major seventh), so keep to the D
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

_ARCHIVE = {}
def archive():
    """THE ARCHIVE's and THE CURATOR's sounds: paper, wood and strings.

    A page turned (and four short pieces of it, each a card flicked), a book shut (cut at its thud, for
    a stamp) and a clave for the knocks. The piano, strings, choir and kettledrums are THE VOID's; the
    pizzicato and the string stabs THE VAULT's: 'minor' is its F sharp minor stab and 'major' its clean
    D major one, each for chords of its own kind only.

    Two recordings are NOT here, after a listen (12 Oct): THE VAULT's 'cello', which is a major-sixth
    chord and put a G sharp under an E minor tune, and a zither's 'open E', which strums a D major chord
    for a third of a second before it reaches its E. Under a tune both sounded like a guitar playing the
    wrong chord. The ground's low notes are the one clean pizzicato, moved down, and bowed() below."""
    if _ARCHIVE: return _ARCHIVE
    a = _ARCHIVE; V = void(); T = vault()
    def norm(x): return x / max(1e-9, float(np.abs(x).max()))
    a['clave'] = [gate(norm(c), 0.1, 0.04) for c in hits_in(sample('TTS_perc_clav_B', trim=False), least=0.08)[:4]]
    page = sample('HardcoverBookPage_BW')
    a['page'] = norm(page)
    a['card'] = [fade(norm(page[int(t * SR):int((t + 0.07) * SR)].copy()), 0.002, 0.03) for t in (0.06, 0.3, 0.55, 0.8) if int((t + 0.07) * SR) < len(page)]
    book = sample('BookHardcover_S08FO')
    env = np.abs(book).max(axis=1); i = int(np.argmax(env))
    a['book'] = norm(book)
    a['stamp'] = fade(norm(book[max(0, i - int(0.008 * SR)):i + int(0.3 * SR)].copy()), 0.001, 0.08)
    a['pizz'] = T['pizz']; a['low'] = {55.03: T['pizz'][55.0]}      # the G alone, with its octaves: the one to move down for a bass note
    a['minor'] = T['strike']; a['major'] = {50.0: T['major'][50.0]}
    for k in ('piano', 'plow', 'strings', 'choir', 'timp'): a[k] = V[k]
    return a

def stopchord(names, at=0.08, secs=0.8):
    """A chord struck on the upright, and the tape it is on switched off under it: the notes sink and
    stand still. `names` is the chord written out ('E3 B3 E4 G4')."""
    n = int(2.4 * SR)
    x = sampler(archive()['piano'], rel=0.5)([Ev(0.0, 1.8, midi(p), 0.9) for p in names.split()], n, dict(t0=0.0))
    x = tapestop(x, at, secs)
    return x / max(1e-9, float(np.abs(x).max()))

def bowed():
    """A cello played short, made here: there is no clean recording of one in the kit."""
    from inst import synth
    return synth('saw', voices=2, detune=0.05, spread=0.15, sq=0.2, cutoff=1200.0, env=1.2, fdecay=0.12, res=0.9, track=0.5,
                 a=0.015, d=0.2, s=0.55, r=0.1, dirt=0.25)

# ---- a written line, in a mirror
_STEPS = [0, 2, 4, 5, 7, 9, 11]
def retro(text):
    """A line backwards: its last note first, each note keeping its own length."""
    return ' '.join(reversed(text.split()))
def flip(text, axis='C5', home='C'):
    """A line in a mirror laid flat: every note as far under the axis as it was over it, counted in steps
    of the scale (the major scale on home, which is its relative minor's as well), so the reflection stays
    in the key. A note from outside the scale counts as the scale note under it. In A minor about C this
    turns A to E, B to D and F to G, so an A minor chord is itself upside down, F and C change places,
    and the dominant becomes the chord a fifth below: the reflection of a cadence is the other cadence."""
    base = int(midi(home + '0')) % 12
    def deg(m):
        m = int(round(m)); rel = (m - base) % 12
        return ((m - base) // 12) * 7 + max(i for i, s in enumerate(_STEPS) if s <= rel)
    def note(k): return base + (k // 7) * 12 + _STEPS[k % 7]
    a = deg(midi(axis)); out = []
    for tok in text.split():
        name, _, d = tok.partition(':')
        if name == 'r': out.append(tok); continue
        acc = '!' if name.endswith('!') else ''
        out.append(f"{note(2 * a - deg(midi(name.rstrip('!'))))}{acc}:{d or 1}")
    return ' '.join(out)
def backward(src, dst, drums=(), swap=None, skip=()):
    """Section dst made of section src played backwards, note for note. A note begins where it used to
    end, counted from the far end (and on the sixteenth at or before that, so a short note stays on the
    grid); a drum, which has no length, lands as far before the end as it was after the start, so the
    bar lines stay where they were. swap renames buses on the way (a struck voice to its played-backwards
    twin, and the other way); skip leaves buses out, for the one-off sounds written by hand."""
    swap = swap or {}; T = src.len; step = src.song.step
    for bus, evs in src.ev.items():
        if bus in skip: continue
        for e in evs:
            t = (T - e.t) % T if bus in drums else max(0.0, math.floor((T - (e.t + e.dur)) / step + 1e-6) * step)
            dst.ev.setdefault(swap.get(bus, bus), []).append(Ev(t, e.dur, e.p, e.v, **{k: v for k, v in e.kw.items() if k != 'slide'}))

_MIRROR = {}
def mirror():
    """THE MIRROR's and THE OTHER's sounds: broken glass, which the user picked (12 Oct).

    Four recordings. A bottle breaking: short, with a thud in it (the crack on a snare, and backwards, a
    bottle un-breaking into a beat). A vase on cement: one big break, then five seconds of its pieces
    coming to rest; those pieces are cut apart here into single shards, each a different clink, for
    where hi-hats would be. Two of debris: a crash with a rattle after it, and a long pour of glass,
    which backwards is the pieces flying back together. They ring far above any tune (3 kHz and up), so
    they are left at the pitch they were recorded at."""
    if _MIRROR: return _MIRROR
    m = _MIRROR
    def norm(x): return x / max(1e-9, float(np.abs(x).max()))
    bottle = sample('SPLC-0905_FX_Oneshot_Glass_Bottle_Break'); vase = sample('SPLC-0915_FX_Oneshot_Glass_Vase_Cement')
    m['smash'] = gate(norm(bottle), 0.5, 0.2)
    m['unsmash'] = fade(norm(bottle)[:int(0.55 * SR)][::-1].copy(), 0.1, 0.003)
    m['break'] = gate(norm(vase), 1.1, 0.4)
    tail = vase[int(0.95 * SR):]
    cuts = [c for c in hits_in(tail, least=0.04) if len(c) > 0.04 * SR]
    loud = sorted(cuts, key=lambda c: -float(np.abs(c).max()))[:14]              # the fourteen clearest pieces
    m['shards'] = [gate(norm(hp(c, 2000.0)), 0.07, 0.04) for c in loud]
    m['debris'] = norm(sample('SPLC-0940_FX_Oneshot_Glass_Debris_Destruction'))
    pour = norm(sample('SPLC-0941_FX_Oneshot_Glass_Debris_Destruction'))
    m['pour'] = pour
    m['unpour'] = fade(pour[:int(1.7 * SR)][::-1].copy(), 0.3, 0.003)
    return m

_HALLOWS = {}
def hallows():
    """ALL HALLOWS' sounds: what the library already had, and seven recordings the user picked for it
    (12 Oct), three of which are loops with the wanted sound somewhere inside them.

    From the library. A tuba playing one short F, for the oom of an oom-pah. Of THE ARCHIVIST's
    harpsichord only two notes are kept, the long low C and a short A: the other two turned out to be
    chords (an E with its major third and seventh, a C sharp with a sixth), and a tune in a minor key
    played on them came out with major thirds all over it. Pizzicato, kettledrums and string stabs are
    THE VAULT's, the ghosts' choir and the upright THE VOID's. A sung bowl on F sharp (a shade flat) is
    the bell: its loudest overtone is a major third two octaves up, so it tolls only on a note whose
    major third is in the key (F in D minor, B flat in G minor), where bowl and overtone are two notes
    of the home chord. The night is a recording of insects; a key turning in a lock is cut into its
    clicks, for a latch; a snow globe being wound is the music box's key, and a kitchen timer's ticks
    the lights' own timer.

    The user's seven. A door: a short dry creak, and a second one after it. A clap of thunder. A storm
    wind rising and falling. A crow, five calls, cut apart. And three loops:
      a music box in F minor, one note at a time. Five of its notes are clean enough to lift (in the
        rest the note before is still ringing loudly, and once the note is moved to another pitch that
        ring is a wrong note: an F with a C in it put a C sharp under every F sharp), each about a third
        of a second and a little sharp, as music boxes are: their roots here are as measured, so they
        play in tune;
      a cathedral organ in C minor. Its first chord is an open fifth, with no third in it, so it can
        stand on any root under any chord; a little later it holds a C minor. Both are kept ('fifth',
        'minor'), about eight cents flat, as measured. pipes() below holds them as long as is asked;
      a harpsichord in C minor: a full arrangement in running sixteenths, every note ringing into the
        next. Only its lowest notes are ever alone, and an F is kept, for the left hand."""
    if _HALLOWS: return _HALLOWS
    h = _HALLOWS; V = vault(); A = archive(); W = void(); H = hive()
    def norm(x): return x / max(1e-9, float(np.abs(x).max()))
    def piece(x, t0, t1, a=0.002, r=0.03): return fade(norm(x[max(0, int(t0 * SR)):int(t1 * SR)].copy()), a, r)
    h['tuba'] = {41.05: gate(sample('TC_tuba_staccato_F'), 0.42, 0.14)}
    h['harpsi'] = {47.89: V['harpsi'][47.89], 68.99: V['harpsi'][68.99]}
    h['pizz'] = V['pizz']; h['low'] = A['low']; h['timp'] = V['timp']
    h['minor'] = V['strike']; h['major'] = {50.0: V['major'][50.0]}
    h['choir'] = W['choir']; h['strings'] = W['strings']; h['piano'] = W['piano']; h['plow'] = W['plow']
    h['bell'] = {53.79: sample('GIO_bowl_medium_strong_Fs')}
    h['clave'] = A['clave']; h['tick'] = V['tick']; h['ratchet'] = V['ratchet']
    h['windup'] = norm(sample('BW_SnowGlobeWindUp', trim=False))
    h['night'] = fade(norm(sample('PHT_insects_03', trim=False)), 0.4, 0.6)
    lock = hits_in(sample('BRS_Lock_Door_Key_Mvs_2', trim=False), least=0.03)
    top = max(float(np.abs(c).max()) for c in lock)
    h['latch'] = [gate(norm(c), 0.09, 0.03) for c in lock if float(np.abs(c).max()) > top * 0.25][:6]
    h['cabasa'] = H['cabasa']; h['ridge'] = H['ridge']; h['guiro'] = H['guiro']
    # the user's seven
    h['creak'] = piece(sample('BRS_Door_Wood_Cheap_Op_Creak', trim=False), 0.05, 0.75, 0.005, 0.1)
    h['thunder'] = piece(sample('BRS_Thunder_Clap_Med_No_Rain_1', trim=False), 0.35, 6.5, 0.01, 2.0)
    h['storm'] = fade(norm(sample('ESM_MU_FX_wind_whoosh_storm_at_sea_heavy_winds_blowing_thunder_rain_waves_billowing_14_em', trim=False)), 0.3, 0.5)
    crow = sample('ESM_HG_Cinematic_FX_creature_animal_bird_crow_morning_calls_05', trim=False)
    h['crow'] = [piece(crow, a, b, 0.003, 0.06) for a, b in ((0.02, 0.74), (0.78, 1.25), (1.26, 1.88), (1.92, 2.46), (2.47, 3.12))]
    box = sample('DBK_TRIV_82_music_box_loop_gargoyle_Fmin', trim=False)
    h['box'] = {root: piece(box, t - 0.004, t + d, 0.001, 0.06) for root, t, d in
                ((82.04, 0.02, 0.38), (85.07, 0.41, 0.36), (90.99, 7.72, 0.34), (92.19, 4.79, 0.36), (96.17, 4.43, 0.36))}
    org = sample('SOUNDDOCTRINE_cathedrals_melodic_loop_tense_04_pipe_organ_chords_hard_90_bpm_Cmin', trim=False)
    h['organ'] = {'fifth': piece(org, 0.0, 0.645, 0.004, 0.02), 'minor': piece(org, 1.69, 2.67, 0.01, 0.02)}
    h['harpsi'][52.97] = piece(sample('PL_BA_90_Harpsi_Loop_Wood_Full_Mix_Cm', trim=False), 7.996, 8.165, 0.001, 0.02)
    return h

def harpsichord():
    """A harpsichord: the pluck is a recording's (the three clean notes there are), the string under it
    is made here, a narrow pulse that is bright when struck and gone in half a second, with a quieter
    one an octave up for the second set of strings."""
    from inst import synth
    pluck = sampler(hallows()['harpsi'], rel=0.1)
    kw = dict(pw=0.16, voices=2, detune=0.04, spread=0.2, cutoff=3400.0, env=2.6, fdecay=0.07, res=0.8, track=0.6, a=0.001, d=0.45, s=0.0, r=0.1)
    body = synth('square', **kw); four = synth('square', octave=1, **kw)
    def play(evs, n, ctx): return pluck(evs, n, ctx) * 0.8 + body(evs, n, ctx) * 0.5 + four(evs, n, ctx) * 0.16
    return play

def sustain(x, secs, xf=0.12):
    """A held sound made longer: past its own length its steady middle goes round again, each turn faded
    into the one before."""
    n = int(secs * SR)
    if n <= len(x): return x[:n]
    a = int(len(x) * 0.3); b = int(len(x) * 0.92); k = min(int(xf * SR), (b - a) // 2)
    w = np.linspace(0.0, 1.0, k)[:, None]
    out = x[:b].copy(); loop = x[a:b]
    while len(out) < n:
        out[-k:] = out[-k:] * np.cos(w * math.pi / 2) + loop[:k] * np.sin(w * math.pi / 2)
        out = np.concatenate([out, loop[k:]])
    return out[:n]

def pipes(rel=0.4):
    """The cathedral organ, from the recording. A note is a chord's root: it sounds the open fifth on
    that root, or with kind='minor' the minor chord, for the note's length. Every root is folded into
    the octave the recording was made in, so nothing is moved more than a fourth or so."""
    H = hallows(); memo = {}
    def play(evs, n, ctx):
        out = np.zeros((n, 2))
        for e in evs:
            kind = 'minor' if e.kw.get('kind') == 'minor' else 'fifth'
            p = e.p
            while p > 54.5: p -= 12
            while p < 42.5: p += 12
            key = (kind, round(p, 2))
            if key not in memo: memo[key] = shift(st(H['organ'][kind]), p - 47.92)
            add(out, gate(sustain(memo[key], e.dur + rel), e.dur, rel), e.t * SR, e.v)
        return out
    return play

def theremin(v=0.3):
    """A hand near an aerial: one soft wave, a wide slow vibrato, and every note reached by sliding
    (write its lines with legato(), most=12)."""
    from inst import synth
    return synth('tri', sq=0.06, cutoff=5200.0, res=0.7, track=0.5, a=0.07, d=0.2, s=0.9, r=0.16, vib=v, vibhz=5.7, vibat=0.1, glide=0.13)

def musicbox(decay=0.9):
    """A music box. The teeth are the recording's, five of its notes; under each is a glassy ring made
    here, since a lifted note stops where the next one began."""
    from inst import keys
    tines = sampler(hallows()['box'], rel=0.1, vel=1.0)
    ring = keys(ratio=6.0, index=0.9, decay=decay, a=0.001, bright=1.0, spread=0.25)
    def play(evs, n, ctx): return tines(evs, n, ctx) * 0.9 + ring(evs, n, ctx) * 0.3
    return play

def bones():
    """A xylophone, for ribs: wood, short and dry."""
    from inst import keys
    return keys(ratio=4.0, index=1.3, decay=0.17, a=0.001, spread=0.3)

def starts(text):
    """Where each note of a written line begins, in steps."""
    at, out = 0.0, []
    for tok in text.split():
        out.append(at); at += float(tok.partition(':')[2] or 1)
    return out
def total(text):
    """How many steps a written line takes."""
    return sum(float(tok.partition(':')[2] or 1) for tok in text.split())
