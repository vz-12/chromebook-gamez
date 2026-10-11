# VOIDRUNNER — the soundtrack and sound plan

Branch: `music` (worktree `C:\chromebook-music`). Nothing reaches `main`
(and so voidrunner.online) until you say ship. This file is `.md`, so
`.assetsignore` keeps it off the public site.

## Where the sound is today (11 Oct, main = 47507b4)

- **Every sound is synthesized in code.** `Audio_` in `index.html` (~line 870)
  is a small WebAudio synth: 16 named blips (`shoot`, `hit`, `boom`,
  `boss`, …) plus about 290 hand-written `Audio_.tone` / `Audio_.noise`
  calls scattered through the bosses, rites, codex and menus. No audio
  file exists anywhere in the repo.
- **One piece of music for the whole game.** A 16-step generative bed (A
  minor pentatonic, bass line A–A–G–C, 96→130 BPM as the room heats up).
  It runs only inside the play step, so the menus, codex, shop, hub and
  every cutscene are silent, and every area and boss sounds the same.
- **One volume slider**, no music/effects split.
- **The 8 Oct memory fix stays.** `SFX_VOICES` (40) and `SFX_GAP` cap how
  many effects sound at once. Everything new goes through the same cap.
- **Sound is cosmetic.** It draws `rnd` (Math.random), never the run's
  seeded `simRnd`, so lockstep, replays and PvP don't care what it does.
  Everything new keeps to that.

## What we are building

1. **A score: every area and every boss gets its own track**, plus menus,
   modes and stingers (the list below: 38 tracks and about 10 stingers).
2. **New sound effects for everything you hear in a fight.** Each pilot's
   weapon, lasers and beams, hits and kills, abilities and awakenings,
   boss tells, the codex, shop and menus.
3. **A sound engine that can play them** in a page built for school
   Chromebooks.

### The reference: what the Calamity tracks tell us

(Measured with the music-analysis skill plus an arrangement profile of my
own. Full numbers are in the analysis section at the end.)

- **Long loops that breathe.** Every track runs 2–3 big cycles with a
  breakdown between them: a near-silent drop, a drum break or a short
  reset. The breakdowns are what keep a 4–6 minute track from wearing you
  out, and in the game they are where a boss changes phase.
- **Three tiers of weight.** The calm piece sits at about −15 dBFS, wide,
  with almost no drums. The biome piece is about −12, mostly sub and bass.
  The fights are −10 to −8.5, wall-to-wall, and start at full force with
  no intro. That becomes the mastering target: rooms and menus quiet and
  wide, sectors full, bosses loudest.
- **The low end is huge.** In the electronic tracks 80–90% of the power is
  under 250 Hz, with rising sub sweeps. The highs stay dark: little energy
  above 8 kHz, even at the loudest.
- **Tempos:** about 129 for the moving tracks, 152 and a ~190 double-time
  feel for the fights.
- **Keys:** minor, or major made bittersweet. Every track is restless
  harmonically: it moves rather than vamping on one chord.

**The rule for inspiration:** every melody, riff and progression is
original. From Calamity we take the DNA (the tempo and energy arcs, the
genre fusion, the instrumentation, how dense the mix is and how it
breathes), never a recognisable hook.

### The musical identity

- **Neon cyber-metal.** Synthwave and industrial electronics carry the
  sectors. Distorted guitars, live drums, choir and orchestra arrive for
  the bosses. Glitch, tape-stop and bitcrush belong to the fracture,
  where the game itself is being edited.
- **One main theme, from the first build.** The motif is grown from the
  original 7 Aug synth bed's bass line (A minor, i–i–VII–III), so the
  whole score descends from the game's first sound. Bosses get motifs of
  their own. THE OTHER plays the main theme inverted (the mirror).
- **ONE POINT OH's version war is literal.** His fight is the old 16-step
  synth and the new score playing the same progression and trading the
  floor, just as the arena splits between the first build's look and
  today's. When the record restores, the new score wins.
  (`onepointoh/first.html` keeps its original sound byte for byte; it is
  never touched.)

## The cue list

BPM and key are starting points, tuned when each track is written.
"Phases" means the boss track has sections the engine can move between on
a bar line when the boss changes phase.

### Sectors (looping area tracks: a calmer and a busier section, moved between by how hot the room is)

| cue | where | brief | start |
|---|---|---|---|
| `grid` | THE GRID, sector 01 | the opening statement: driving synthwave with the main theme, clean and fast | 140, A minor |
| `foundry` | THE FOUNDRY, sector 02 | industrial: anvil and metal percussion, distorted bass, steam | 132, D minor |
| `hive` | THE HIVE, sector 03 | organic and wrong: skittering percussion, insect-wing textures, swung | 126, F♯ minor |
| `vault` | THE VAULT, sector 04 | cold and crystalline: arpeggios, glass bells, mystery | 118, B minor |
| `void` | THE VOID, sector 05 | vast and dark: sub bass, slow pulse, distant choir | 100 (half-time), C minor |
| `archive` | THE ARCHIVE, fracture i | redacted: bitcrushed piano, tape-stops, deleted bars | 124, E minor |
| `mirror` | THE MIRROR, fracture ii | reversed sounds, a palindromic melody | 128, A minor |
| `leak` | THE LEAK, fracture iii | acid: a squelching 303 line, toxic and relentless | 136, G minor |
| `recursion` | THE RECURSION, fracture iv | phasing loops that drift against each other, polyrhythm | 130, D♯ minor |
| `halt` | THE HALT, fracture v | nearly still: clock ticks, stutters, freeze-frames | 90, free |
| `rootroom` | ROOT'S ROOM | a terminal: chiptune over industrial | 150, C♯ minor |
| `library` | THE LIBRARIES | quiet: celesta, music box, dust | 80, F major / D minor |
| `hub` | THE HUB | home: the main theme on piano and pads | 90, A minor |
| `stands` | THE STANDS | before the tribunal: a hall waiting for one man, koto and low drums | 70, D minor |
| `shop` | shop and portal rooms | the shopkeeper's lounge: jazzy chiptune | 100, E♭ major |
| `planetarium` | planetarium | celestial pads, a slow arpeggio | 72, B♭ lydian |
| `patch` | ALL HALLOWS i, THE PATCH | spooky swing: harpsichord and organ over metal | 150 swung, D minor |
| `house` | ALL HALLOWS ii, THE HOUSE | haunted mansion: music box, creaks, slow waltz into breakdown | 3/4, G minor |
| `yard` | ALL HALLOWS iii, THE YARD | graveyard: bells, choir, doom | 76, C minor |
| `vigil` | the vigil | candlelit, waiting | 60, A minor |

### Bosses (one track each, with phases)

| cue | boss | brief | start |
|---|---|---|---|
| `warden` | THE WARDEN | the first wall: metal riff on the main theme, live drums | 160, A minor |
| `forgeheart` | FORGEHEART | furnace metal: brass hits, hammered percussion | 165, D minor |
| `broodmother` | BROODMOTHER | nu-metal groove, a creeping choir, skittering hi-hats | 145, F♯ minor |
| `archivist` | THE ARCHIVIST | orchestral and glitched: harpsichord, staccato strings | 170, B minor |
| `null` | NULL | the act-one finale: full choir, orchestra and breakcore | 175, C minor |
| `curator` | THE CURATOR | stately: string quartet over industrial | 150, E minor |
| `other` | THE OTHER (+ the corrupted OTHER) | drum and bass against metal, main theme inverted | 174, A minor |
| `keeper` | THE BOOKKEEPER | baroque metal: harpsichord and guitars, ledger ticking | 168, F minor |
| `shopkeeper` | THE SHOPKEEPER | jazz-metal: walking bass, ka-ching percussion | 180 swung, E♭ minor |
| `unwritten` | THE UNWRITTEN | a blank page: sparse piano that writes itself into a full orchestra | 120→180, C minor |
| `amalgam` | THE AMALGAM (EMBER's rite) | doom metal and choir, enormous and slow, then fast | 70/140, D minor |
| `root` | ROOT (THE HACKER's rite, the race) | hacker metal: chiptune leads, industrial drums, the race gets its own section | 170, C♯ minor |
| `tribunal` | THE TRIBUNAL | he does not fight: a court of drums, tension that never releases | 90, D minor |
| `founder` | THE FOUNDER (THE VAGRANT's rite, the duel) | the samurai: taiko, shakuhachi, koto, metal | 150, D minor |
| `onepointoh` | ONE POINT OH | the version war: the first build's synth against the full score | 140, A minor |
| `backlog` | THE BACKLOG (ALL HALLOWS i) | pumpkin-patch metal | 165, D minor |
| `deadgame` | DEAD GAME (ALL HALLOWS ii) | a dead game's title music, haunted | 155, G minor |
| `ragequit` | RAGEQUIT (ALL HALLOWS iii, when built) | furious, glitching, about to unplug | 180, C minor |

### Menus, modes, stingers

| cue | where | brief |
|---|---|---|
| `title` | the main menu | the main theme, slow and wide |
| `codex` | codex and FORGOTTEN TALES | quiet ambient, a page-turn texture |
| `rush` | boss rush | a medley: each boss's motif in one driving track |
| `pvp` | PvP matches | competitive and tight, two sections |
| sting `boss-in` | a boss arrives | an impact and a riser in the boss's key (per boss: its motif's first notes) |
| sting `boss-down` | a boss dies | a victory hit, then into the reward room |
| sting `wave` | a wave starts | a short rise |
| sting `levelup` | level up | a bright figure |
| sting `over` | game over | a falling piano phrase |
| sting `win` | a run is won | the main theme's cadence |
| sting `intrusion` | THE INTRUSION | `room.clear()`: a tape-stop into silence |

Tutorial, dailies and challenges reuse the sector tracks.

### Sound effects

**Combat (SFX I)**
- Each pilot's weapon: VOIDRUNNER's shot, EMBER's laser (start, sustain,
  end), THE HACKER's shot, THE VAGRANT's blade (swing, parry, perfect
  parry, chain). 3–5 variations each, with a small pitch drift.
- Hits, crits, kills, elite kills, explosions (small, big), the dash, being
  hurt, shields, healing, gems, drops.
- Enemy fire: spitter, turret, artillery, sentinel, prism beams, phaser.
- Lasers and beams: AMALGAM's beam, the lance, sweeps.

**Abilities and set pieces (SFX II)**
- Awakenings: SUPERUSER (Z/X/C/V, the cut-in), OVERDRIVE (SCORCHED EARTH,
  PYROTECHNICS, BRAND, FUSION CORE), RONIN (LUNAR CLEAVE, CLEAR SKY, STILL
  WATER), LAST VOW.
- Boss tells and signatures: each boss's attack warnings, phase changes,
  deaths.
- The codex: open, page turn, close, a tale unlocked.
- UI: select, confirm, back, buy, reroll, can't afford, level-up card.
- Portals, the shop's arrival, the planetarium's reading, the rites'
  cut-ins, the vigil's count.

## How it works

### The engine (Step 2)

- **A music director** runs every frame, outside the sim step, and picks a
  cue and section from what is on screen: the stage, whether a boss is up
  and in which phase, the room (library, hub, shop, stands), the screen
  (menu, codex, game over). Replays and spectators run the same director,
  so they hear the same music.
- **Tracks stream in bar-aligned segments.** Each track is cut into short
  Ogg Opus pieces that the engine schedules back to back, sample-accurate.
  Gapless loops come free, sections change on a bar line, and only about
  three segments are decoded at once. A whole decoded 2½-minute track would
  hold about 50 MB; this holds about 15. A manifest (`music/manifest.json`)
  lists each track's BPM, segments, sections and loop points.
- **Changes are musical.** A boss arriving cuts to its `boss-in` sting and
  the boss track on the next beat. Phases move on a bar line. Leaving a
  room crossfades.
- **Effects are small decoded files** with variations and a little random
  pitch. They go through the existing voice cap and gap.
- **Anything without a file falls back to today's synth.** Each step can
  ship on its own, and sounds arrive one by one. No network, an old
  browser, or no Opus support means the game sounds exactly as it does
  today.
- **Settings get MUSIC and EFFECTS sliders.** Today's VOLUME stays as the
  master.
- **The sim never notices.** Cosmetic RNG only, inert in the Node test VM;
  `npm test` and `npm run test:lockstep` pass unchanged.

### The studio (Step 3)

- **Composing in code.** Each track is a score file I write (notes,
  drums, sections, mix) and a renderer in Python turns into audio.
  The renderer is a small DAW: a sequencer, a sampler (pitched Splice
  one-shots), synths (supersaws, basses, pads, a 303), mixing, reverb and
  a master limiter. It cuts the result into bar-aligned segments, encodes
  Opus, and writes the manifest.
- **Splice supplies the real instruments.** A shared kit of one-shots
  (drums, guitar chugs and power chords, choir, strings, brass, piano,
  harpsichord, bells, impacts, risers), plus a few signature loops per
  track (a guitar riff, a taiko ensemble, a choir phrase), conformed to
  the track's tempo and key.
- **Licensing.** Splice samples may be used inside finished work but not
  passed on as samples, and this repo is public. Raw downloads live in
  `music-src/`, which is gitignored and never served. Only finished mixes
  and processed effects are committed, under `music/` and `sfx/`.
  (That is my reading of Splice's license; worth a glance at your plan's
  terms.)
- **Credits.** Every Splice download spends one credit the first time.
  Rough total: about 150–200 (a kit of ~40, ~2–3 signature loops per
  track, ~30–40 for effects). I list what I want before each step's
  downloads and you approve the batch. Each step's report says how many
  were spent.

### Size and performance (school Chromebooks)

- About 1.5–2 MB per track at 96 kbps Opus, about 65 MB for the whole
  score. A player downloads only what they reach, a segment at a time,
  and the browser caches it. Static files don't count against the
  Worker's request budget.
- Effects total about 3 MB, loaded when a run starts.
- Memory stays bounded: about 3 music segments plus the effect buffers
  (about 25 MB, against the hundreds the 8 Oct leak reached).

## The steps

Each step: build, test, commit to `music`, then stop and report. Nothing
is pushed until you say; `main` only when you say ship.

1. **Listen and plan.** Analyze the references, inventory every area,
   boss and sound in the game, and write this file. *(done)*
2. **The engine.** Music director, segment streaming, sample effects with
   fallback, MUSIC/EFFECTS sliders, tests. Nothing sounds different yet.
3. **The studio and the first slice.** The renderer, the shared kit, and
   `grid` + `warden`, the `boss-in` sting, and four effects (VOIDRUNNER's
   shot, EMBER's laser, a hit, the codex opening). **You listen and approve
   the direction before anything else is made.** (First credits: about 50.)
4. **ALL HALLOWS.** `patch`, `backlog`, `house`, `deadgame`, `vigil`, and
   `yard` + `ragequit` once chapter III is built. It's early on purpose:
   chapter II opens 14 Oct and chapter III 23 Oct.
5. **The sectors.** `foundry`, `hive`, `vault`, `void` and their bosses.
6. **THE FRACTURE.** `archive`, `curator`, `mirror`, `other`, `leak`,
   `recursion`, `halt`, the `intrusion` sting, `rootroom`, `root`.
7. **The secret rooms and the story.** `library`, `keeper`, `shop`,
   `shopkeeper`, `planetarium`, `unwritten`, `amalgam`, `hub`, `stands`,
   `tribunal`, `founder`, `onepointoh`.
8. **Menus, modes and stingers.** `title`, `codex`, `rush`, `pvp`, and the
   rest of the stings.
9. **SFX I: combat.**
10. **SFX II: abilities, set pieces, codex and UI.**
11. **Mix and ship.** A loudness and balance pass across the whole score, a
    size and memory check on a Chromebook-class budget, the changelog, and
    ship when you say.

## Reference analysis

Four tracks from the Calamity OST, analyzed 11 Oct. "Energy" is relative
within the track; "percussive" is the drum share of the sound (HPSS).
Loudness is a gated RMS in dBFS, close enough to compare the tracks with
each other.

| track | length | tempo | key | loudness | shape | use it for |
|---|---|---|---|---|---|---|
| The Tale of a Cruel World | 4:21 | ~129 | C minor | −15.0, wide (0.83) | sparse keys 0:00–0:38, then full ensemble; three swells (1:08, 2:50, 4:00) falling back between; almost no drums (0.04) | `title`, `hub`, `codex`, `library`, `stands`, the start of `unwritten` |
| wasteland | 6:21 | 129, grid-locked | D major, bittersweet | −12.1, narrow (0.24) | 20 s intro, two minutes of wall, near-silent breakdown 2:20–3:10, repeat, second breakdown 5:15–5:55; energy pumps bar by bar; 90% of the power under 250 Hz | the sector tracks: a long loop that sits under combat and breathes |
| Guardian of The Former Seas | 4:34 | 95.7 measured (likely a ~190 double-time feel) | F minor | −10.3 | full force from the first bar, short 10 s resets at ~1:00 and ~3:00, percussion-forward passages at ~1:40 and ~3:45 | the boss tracks: no intro, resets as phase changes |
| 1NF3$+@+!0N | 4:34 | 152, grid-locked | F♯ minor | −8.5, heavily limited (crest 9.4 dB) | a wall of sound from the start, rising sub sweeps, two drum-break breakdowns (1:52–2:10, 4:00–4:15) where the drums are left alone and then everything slams back; the brightest of the four | the hardest bosses and THE FRACTURE |

**More references.** You have 32 tracks from the OST to draw on. The more
of them I can analyze, the closer each cue can get to the right one (a
calm-biome track for the library, a mechanical one for THE FOUNDRY, a
final-boss track for ONE POINT OH). Each cue's row will name its nearest
reference.

Tools: the music-analysis skill's full listen (run under a venv, since
numba crashes against numpy 2.4 on this machine), plus an arrangement
profile (spectrogram, energy and percussive share per 4 s, band balance,
loudness, stereo width).
