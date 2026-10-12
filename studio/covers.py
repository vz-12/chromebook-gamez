"""Puts the cover art beside the music, for THE SOUNDTRACK in the game (MUSIC-PLAN.md).

  python studio/covers.py           every master that matches a built track
  python studio/covers.py --list    what would be done, and what has no picture yet

A master is music-src/covers/NN-its-title.jpg (d2-NN-its-title.jpg on disk two; .png too): 3000 px square, made elsewhere, never
published. Its track is the one whose title makes that name ("Entry Vector" is entry-vector); the number
in front is only its place on the disk. What the game shows is small: 512 px, WebP, written to
music/covers/<cue>-<hash>.webp and named in the manifest as the track's `cover`. The hash is the
picture's own, so a cover that changes gets a new name and the old file goes.

A track with no master keeps whatever the manifest says of it (nothing, at first): the game draws
its colour and its number until a picture arrives. Run this again whenever covers are added.
"""
import os, re, sys, glob, json, hashlib, io
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MASTERS = os.path.join(ROOT, 'music-src', 'covers')
MUSIC = os.path.join(ROOT, 'music')
SIZE = 512
QUALITY = 82

def slug(s): return re.sub(r'[^a-z0-9]+', '-', s.lower()).strip('-')

def small(path):
    """A master, cut square about its middle and brought down to SIZE: the bytes of the WebP."""
    im = Image.open(path).convert('RGB')
    w, h = im.size; s = min(w, h)
    im = im.crop(((w - s) // 2, (h - s) // 2, (w - s) // 2 + s, (h - s) // 2 + s)).resize((SIZE, SIZE), Image.LANCZOS)
    out = io.BytesIO(); im.save(out, 'WEBP', quality=QUALITY, method=6)
    return out.getvalue()

def main(dry):
    p = os.path.join(MUSIC, 'manifest.json')
    with open(p, encoding='utf-8') as f: m = json.load(f)
    masters = {}
    for q in sorted(glob.glob(os.path.join(MASTERS, '*.jpg')) + glob.glob(os.path.join(MASTERS, '*.png'))):
        name = os.path.splitext(os.path.basename(q))[0]
        if name.startswith('contact-sheet'): continue
        masters[re.sub(r'^(?:d\d+-)?\d+-', '', name)] = q       # 03-its-title, or d2-03-its-title on a later disk
    os.makedirs(os.path.join(MUSIC, 'covers'), exist_ok=True)
    used, size = set(), 0
    for cue, tr in m['tracks'].items():
        q = masters.get(slug(tr.get('title', ''))) or masters.get(cue)
        if not q:
            print(f"  {cue:12s} {tr.get('title', '?'):34s} no picture yet"); continue
        used.add(q)
        if dry:
            print(f"  {cue:12s} {tr.get('title', '?'):34s} <- {os.path.basename(q)}"); continue
        data = small(q)
        f = f'covers/{cue}-{hashlib.sha1(data).hexdigest()[:6]}.webp'
        for old in glob.glob(os.path.join(MUSIC, 'covers', cue + '-*.webp')):
            if os.path.basename(old) != os.path.basename(f): os.remove(old)
        if not os.path.exists(os.path.join(MUSIC, f)):
            with open(os.path.join(MUSIC, f), 'wb') as o: o.write(data)
        tr['cover'] = f; size += len(data)
        print(f"  {cue:12s} {tr.get('title', '?'):34s} <- {os.path.basename(q):44s} {len(data) / 1000:5.0f} KB")
    for name, q in masters.items():
        if q not in used: print(f'  (no track is called {name}: {os.path.basename(q)})')
    if not dry:
        with open(p, 'w', encoding='utf-8', newline='\n') as f: json.dump(m, f, indent=1); f.write('\n')
        print(f'  {len(used)} covers, {size / 1e6:.2f} MB in music/covers/')

if __name__ == '__main__':
    main('--list' in sys.argv)
