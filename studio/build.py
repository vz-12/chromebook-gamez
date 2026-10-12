"""Renders scores into what the game plays (MUSIC-PLAN.md, step 3).

  python studio/build.py grid warden      the named tracks
  python studio/build.py --stings         the stings (studio/scores/stings.py)
  python studio/build.py --all            everything in studio/scores/
  python studio/build.py --flags grid     only what the manifest says of a built track's sections (lock, next,
                                          moods, start), from its score: nothing is rendered

For each track: music/<cue>/<section><k>-<hash>.opus, one file per bar-aligned
piece, and its entry in music/manifest.json (the other tracks' entries are
left alone). A listening copy of the track played through goes to
music-src/out/, which git and the site ignore; so does a report with the
numbers this was checked by, since nobody here can hear it.

Run it with the venv that has numpy 2.2, scipy, soundfile, soxr, numba.
"""
import os, sys, json, glob, importlib, time
import numpy as np
import soundfile as sf
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import daw
from daw import SR, ROOT, write_opus, digest, measure, loudness, dbfs

MUSIC = os.path.join(ROOT, 'music')
OUT = os.path.join(ROOT, 'music-src', 'out')
PRE = 0.01            # silence before each piece's bar line, so a decoder's first samples are never music
QUALITY = 0.83        # libsndfile's Opus level: about 96 kbit/s for a full stereo mix

def load_manifest():
    p = os.path.join(MUSIC, 'manifest.json')
    if os.path.exists(p):
        with open(p, encoding='utf-8') as f: return json.load(f)
    return {'v': 1, 'tracks': {}, 'stings': {}}
def save_manifest(m):
    os.makedirs(MUSIC, exist_ok=True)
    with open(os.path.join(MUSIC, 'manifest.json'), 'w', encoding='utf-8', newline='\n') as f:
        json.dump(m, f, indent=1); f.write('\n')

def listening_copy(name, x):
    """A file to play outside the game: MP3 where this libsndfile can write it, FLAC where it cannot."""
    os.makedirs(OUT, exist_ok=True)
    x = np.clip(x, -1, 1).astype(np.float32)
    try:
        p = os.path.join(OUT, name + '.mp3')
        sf.write(p, x, SR, format='MP3', subtype='MPEG_LAYER_III')
    except Exception:
        p = os.path.join(OUT, name + '.flac')
        sf.write(p, x, SR, format='FLAC', subtype='PCM_16')
    return p

def whole(song):
    """Whether this track's sections each play out before another may follow. A sector's do (12 Oct, after
    a listen): its calm and its fight used to swap at every piece, and the game's fight-or-calm turns with
    every wave, so the music kept jumping between the two and starting each over. Now a section, once
    begun, is heard to its last bar, and the mood is asked only there. A boss's phases are left open: a
    new phase cuts in on the next piece, and happens once."""
    return any(k in ('calm', 'fight') for k in (song.moods or {}))
def flags(song, sec):
    """What the manifest says of a section besides its pieces."""
    d = {}
    if sec.lock or whole(song): d['lock'] = True
    if sec.next: d['next'] = sec.next
    elif not sec.loop: d['next'] = 'end'
    return d
def describe(mod, song, entry):
    if getattr(mod, 'TITLE', None): entry['title'] = mod.TITLE          # the track's name, for a credits list one day
    if song.moods: entry['moods'] = song.moods
    if song.start: entry['start'] = song.start
    entry['order'], entry['loop'] = running_order(mod, song)
    return entry
def running_order(mod, song):
    """The song from its top, for THE SOUNDTRACK in the game: the sections in the order the listening copy
    plays them, and the place it comes round to (after an opening that is played once, the section after
    it). Where the listening copy ends by coming back to that place, the game does that itself."""
    by = {x.name: x for x in song.sections}
    order = [o for o in getattr(mod, 'ORDER', [x.name for x in song.sections]) if o in by]
    loop = 1 if len(order) > 1 and order[0] == song.start and not by[order[0]].loop else 0
    while len(order) > loop + 1 and order[-1] == order[loop]: order.pop()
    return order, loop

def reflag(cue):
    """A built track's flags written again from its score, its pieces left as they are."""
    mod = importlib.import_module('scores.' + cue); song = mod.song()
    m = load_manifest(); e = m['tracks'][cue]
    names = [s.name for s in song.sections]
    if names != list(e['sections']): raise SystemExit(f'{cue}: its sections have changed ({names}): build it')
    e['sections'] = {s.name: {'segs': e['sections'][s.name]['segs'], **flags(song, s)} for s in song.sections}
    for k in ('title', 'moods', 'start', 'order', 'loop'): e.pop(k, None)
    describe(mod, song, e); save_manifest(m)
    print(f"{cue}: " + ', '.join(f"{k}{' (whole)' if v.get('lock') else ''}{' -> ' + v['next'] if v.get('next') else ''}" for k, v in e['sections'].items()))

def build_track(cue):
    mod = importlib.import_module('scores.' + cue)
    song = mod.song()
    t0 = time.time()
    print(f'{cue}: {song.bpm} BPM, target {song.target} dBFS')
    pieces, stats = song.render()
    folder = os.path.join(MUSIC, cue)
    same = lambda q: os.path.normcase(os.path.abspath(q))
    stale = {same(q) for q in glob.glob(os.path.join(folder, '*.opus'))}
    segs, sections, size = [], {}, 0
    pre = np.zeros((int(PRE * SR), 2))
    for sec in song.sections:
        ids = []
        for k, p in enumerate(pieces[sec.name]):
            x = np.concatenate([pre, p])
            f = f'{cue}/{sec.name}{k}-{digest(x)}.opus'
            # a file's name is its sound's own hash: one already there is this piece, and encoding it again
            # would only change its bytes (the container's serial number) for git to carry
            if same(os.path.join(MUSIC, f)) in stale: stale.discard(same(os.path.join(MUSIC, f)))
            else: write_opus(os.path.join(MUSIC, f), x, QUALITY)
            size += os.path.getsize(os.path.join(MUSIC, f))
            ids.append(len(segs))
            segs.append({'f': f, 's': round(sec.seg * song.bar, 6)})
        sections[sec.name] = {'segs': ids, **flags(song, sec)}
    for old in stale: os.remove(old)                                  # pieces this build no longer makes
    entry = describe(mod, song, {'bpm': song.bpm, 'pre': PRE, 'segs': segs, 'sections': sections})
    m = load_manifest(); m['tracks'][cue] = entry; save_manifest(m)

    # the track as the game would play it through, to listen to and to measure
    order = getattr(mod, 'ORDER', [s.name for s in song.sections])
    mix = song.playthrough(pieces, order)
    copy = listening_copy(cue, mix)
    secs = sum(s.len for s in song.sections)
    # and the same from the files as written, laid out the way the game lays them out: it has to be the same sound
    back = np.zeros_like(mix); at = 0
    for o in order:
        for i in sections[o]['segs']:
            x, _ = sf.read(os.path.join(MUSIC, segs[i]['f']), always_2d=True)
            daw.add(back, x, at - int(PRE * SR)); at += int(round(segs[i]['s'] * SR))
    err = back - mix
    snr = 10 * np.log10(float((mix ** 2).sum()) / max(float((err ** 2).sum()), 1e-20))
    print(f"  from the files, as the game joins them: {snr:.1f} dB above the difference (Opus alone is about 20), "
          f"peak {dbfs(np.abs(back).max()):.1f} dBFS")
    rep = {'cue': cue, 'bpm': song.bpm, 'order': order, 'unique_secs': round(secs, 1), 'bytes': size, 'files_snr': round(snr, 1),
           'kbps': round(size * 8 / max(secs, 1) / 1000, 1), 'master': stats, 'mix': measure(mix),
           'sections': {s.name: measure(song.playthrough(pieces, [s.name])) for s in song.sections}}
    with open(os.path.join(OUT, cue + '.json'), 'w', encoding='utf-8') as f: json.dump(rep, f, indent=1)
    mm = rep['mix']
    print(f"  {len(segs)} pieces, {size / 1e6:.2f} MB ({rep['kbps']} kbit/s over {secs:.0f}s of music), {time.time() - t0:.0f}s to render")
    print(f"  play-through: loud {mm['loud']} dBFS, crest {mm['crest']} dB, low {mm['low']}, mid {mm['mid']}, air {mm['air']}, "
          f"width {mm['width']}, small speaker {mm['small']} dB  ->  {os.path.relpath(copy, ROOT)}")
    return rep

def build_stings():
    mod = importlib.import_module('scores.stings')
    m = load_manifest(); m.setdefault('stings', {})
    folder = os.path.join(MUSIC, 'stings'); os.makedirs(folder, exist_ok=True)
    for name, make in mod.STINGS.items():
        x, hit = make()
        f = f'stings/{name}-{digest(x)}.opus'
        for old in glob.glob(os.path.join(folder, name + '-*.opus')):
            if os.path.basename(old) != os.path.basename(f): os.remove(old)
        if not os.path.exists(os.path.join(MUSIC, f)): write_opus(os.path.join(MUSIC, f), x, QUALITY)
        d = {'f': f}
        if hit: d['hit'] = round(hit, 3)
        m['stings'][name] = d
        listening_copy('sting-' + name, x)
        mm = measure(x)
        print(f"sting {name}: {len(x) / SR:.2f}s, lands at {hit}s, peak {mm['peak']} dBFS, small speaker {mm['small']} dB, "
              f"{os.path.getsize(os.path.join(MUSIC, f)) / 1000:.0f} KB")
    save_manifest(m)

if __name__ == '__main__':
    args = sys.argv[1:]
    if '--all' in args:
        here = os.path.dirname(os.path.abspath(__file__))
        args = [os.path.basename(p)[:-3] for p in sorted(glob.glob(os.path.join(here, 'scores', '*.py')))
                if not os.path.basename(p).startswith('_') and os.path.basename(p) != 'stings.py'] + ['--stings']
    for a in args:
        if a == '--stings': build_stings()
        elif not a.startswith('-'): (reflag if '--flags' in args else build_track)(a)
