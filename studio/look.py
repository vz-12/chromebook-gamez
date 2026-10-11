"""Looks at a track, since nobody here can listen to it (MUSIC-PLAN.md, step 3).

  python studio/look.py grid            the balance: each bus alone, per section, in dB
  python studio/look.py grid --picture  and a picture of the play-through (spectrogram, level, sections)
  python studio/look.py grid --key      and what key and tempo an analysis hears in it

The balance table is how a mix is corrected here: a bus that is 10 dB over the
rest, or missing, shows up as a number.
"""
import os, sys, copy, importlib
import numpy as np
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from daw import SR, ROOT, loudness, dbfs, hp, lp, measure

def balance(song):
    names = list(song.bus)
    rows = {}
    for sec in song.sections:
        n = int(np.ceil(sec.bars / sec.seg))
        full = song._loop(sec, [song.piece(sec, k) for k in range(n)])
        ref = loudness(full)
        row = {}
        for name in names:
            if not sec.ev.get(name): continue
            solo = copy.copy(song); solo.bus = {name: song.bus[name]}
            # the kick still has to duck the others, so the kick's notes stay known to the section
            solo._kicks = lambda s, song=song: song._kicks(s)
            x = solo._loop(sec, [solo.piece(sec, k) for k in range(n)])
            row[name] = (loudness(x) - ref, dbfs(np.abs(x).max()), loudness(hp(x, 200.0, 4)) - ref)
        rows[sec.name] = (ref, row)
    print(f"{'bus':8s}" + ''.join(f'{s.name:>22s}' for s in song.sections))
    print(f"{'':8s}" + ''.join(f"{'loud  peak  >200Hz':>22s}" for _ in song.sections))
    for name in names:
        line = f'{name:8s}'
        for sec in song.sections:
            r = rows[sec.name][1].get(name)
            line += f'{r[0]:10.1f}{r[1]:6.1f}{r[2]:6.1f}' if r else f"{'-':>22s}"
        print(line)
    print(f"{'(mix)':8s}" + ''.join(f'{rows[s.name][0]:10.1f}{"":12s}' for s in song.sections) + '   dBFS before the master')

def picture(cue, song, mod):
    import matplotlib; matplotlib.use('Agg')
    import matplotlib.pyplot as plt, librosa, librosa.display, soundfile as sf
    pieces, _ = song.render(log=lambda *a: None)
    order = getattr(mod, 'ORDER', [s.name for s in song.sections])
    x = song.playthrough(pieces, order)
    m = librosa.resample(x.mean(axis=1), orig_sr=SR, target_sr=22050)
    S = librosa.feature.melspectrogram(y=m, sr=22050, n_fft=2048, hop_length=512, n_mels=128, fmax=11000)
    fig, ax = plt.subplots(2, 1, figsize=(18, 8), gridspec_kw={'height_ratios': [3, 1]})
    librosa.display.specshow(librosa.power_to_db(S, ref=np.max), sr=22050, hop_length=512, x_axis='time', y_axis='mel', fmax=11000, ax=ax[0], cmap='magma')
    blk = int(0.2 * SR)
    r = np.array([dbfs(np.sqrt((x[i:i + blk] ** 2).mean())) for i in range(0, len(x) - blk, blk)])
    ax[1].plot(np.arange(len(r)) * 0.2, r); ax[1].set_ylim(-40, 0); ax[1].set_xlim(0, len(x) / SR); ax[1].set_ylabel('RMS dBFS'); ax[1].grid(alpha=0.3)
    at = 0.0
    for o in order:
        sec = next(s for s in song.sections if s.name == o)
        for a in ax: a.axvline(at, color='cyan', lw=1)
        ax[0].text(at + 0.3, 9000, o, color='cyan', fontsize=11)
        at += sec.len
    p = os.path.join(ROOT, 'music-src', 'out', cue + '.png')
    plt.tight_layout(); plt.savefig(p, dpi=70); plt.close()
    print('picture:', os.path.relpath(p, ROOT))

def key(cue, song):
    import librosa, soundfile as sf
    for ext in ('.mp3', '.flac'):
        p = os.path.join(ROOT, 'music-src', 'out', cue + ext)
        if os.path.exists(p): break
    x, sr = sf.read(p, always_2d=True); m = librosa.resample(x.mean(axis=1), orig_sr=sr, target_sr=22050)
    tempo = float(np.atleast_1d(librosa.beat.beat_track(y=m, sr=22050)[0])[0])
    # from C3 up, and at concert pitch: below that a semitone is a few hertz wide and every low note smears
    # into its neighbours, which is how a riff on F sharp with one G in it came out as G minor
    ch = librosa.feature.chroma_cqt(y=librosa.effects.harmonic(m), sr=22050, fmin=librosa.note_to_hz('C3'), n_octaves=5, tuning=0.0).mean(axis=1)
    maj = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    mnr = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    best = sorted([(float(np.corrcoef(np.roll(prof, i), ch)[0, 1]), names[i] + suf) for i in range(12) for prof, suf in ((maj, ' major'), (mnr, ' minor'))], reverse=True)
    print(f"heard: {tempo:.1f} BPM (written {song.bpm}); key {best[0][1]} ({best[0][0]:.2f}), then {best[1][1]} ({best[1][0]:.2f})")

if __name__ == '__main__':
    cue = sys.argv[1]
    mod = importlib.import_module('scores.' + cue)
    song = mod.song()
    balance(song)
    if '--picture' in sys.argv: picture(cue, song, mod)
    if '--key' in sys.argv: key(cue, song)
