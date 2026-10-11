"""Measures every raw sample in music-src/ (I cannot audition them): length,
level, where the hit starts, how long it rings, brightness and pitch.
  python studio/probe.py [folder]
"""
import os, sys, json
import numpy as np, soundfile as sf, librosa

def probe(path):
    x, sr = sf.read(path, always_2d=True, dtype='float32')
    ch = x.shape[1]
    m = x.mean(axis=1)
    peak = float(np.abs(x).max())
    rms = float(np.sqrt((m ** 2).mean()))
    env = np.abs(m)
    win = max(1, int(sr * 0.003))
    env = np.convolve(env, np.ones(win) / win, mode='same')
    thr = env.max() * 0.1
    on = int(np.argmax(env > thr))
    pk = int(np.argmax(env))
    # the ring: time from the peak until the envelope stays under -40 dB of it
    low = np.nonzero(env[pk:] > env.max() * 0.01)[0]
    ring = (low[-1] if len(low) else 0) / sr
    S = np.abs(librosa.stft(m, n_fft=2048, hop_length=512))
    f = librosa.fft_frequencies(sr=sr, n_fft=2048)
    P = (S ** 2).sum(axis=1)
    cen = float((f * P).sum() / max(P.sum(), 1e-12))
    low_share = float(P[f < 250].sum() / max(P.sum(), 1e-12))
    pitch = None
    try:
        seg = m[pk:pk + int(sr * min(1.0, max(0.15, ring)))]
        if len(seg) > 2048:
            f0 = librosa.yin(seg, fmin=30, fmax=1200, sr=sr, frame_length=4096)
            f0 = f0[np.isfinite(f0)]
            if len(f0):
                hz = float(np.median(f0))
                pitch = {'hz': round(hz, 1), 'note': librosa.hz_to_note(hz, cents=True, unicode=False)}
    except Exception as e:
        pitch = {'err': str(e)[:60]}
    return {'sr': sr, 'ch': ch, 'secs': round(len(m) / sr, 3), 'peak_db': round(20 * np.log10(max(peak, 1e-9)), 1),
            'rms_db': round(20 * np.log10(max(rms, 1e-9)), 1), 'onset_ms': round(on / sr * 1000, 1),
            'peak_ms': round(pk / sr * 1000, 1), 'ring_s': round(ring, 2), 'centroid_hz': round(cen),
            'low_share': round(low_share, 2), 'pitch': pitch}

if __name__ == '__main__':
    here = os.path.dirname(os.path.abspath(__file__))
    folder = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, '..', 'music-src', 'splice')
    out = {}
    for name in sorted(os.listdir(folder)):
        if not name.lower().endswith('.wav'):
            continue
        r = probe(os.path.join(folder, name))
        out[name] = r
        p = r['pitch'] or {}
        print(f"{name[:52]:52s} {r['sr']//1000}k {r['ch']}ch {r['secs']:6.2f}s pk {r['peak_db']:5.1f} rms {r['rms_db']:5.1f} "
              f"on {r['onset_ms']:6.1f}ms ring {r['ring_s']:5.2f}s cen {r['centroid_hz']:5d} low {r['low_share']:.2f} {p.get('note', '')} {p.get('hz', '')}")
    json.dump(out, open(os.path.join(folder, 'probe.json'), 'w'), indent=1)
