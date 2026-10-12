# VOIDRUNNER — the soundtrack and sound plan

Branch: `music` (worktree `C:\chromebook-music`). Work reaches `main` (and
so voidrunner.online) only when you say ship. **Disk one shipped on 12 Oct
as 1.6** (main = f40dcf3): the engine, MUSIC and EFFECTS, four effects, and
act one's ten tracks. This file is `.md`, so `.assetsignore` keeps it off
the public site; the repository is public, though, so it names nothing that
is not released.

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
| `grid` "Entry Vector" | THE GRID, sector 01 | the opening statement: driving synthwave with the main theme, clean and fast | 140, A minor |
| `foundry` "The Line Never Stops" | THE FOUNDRY, sector 02 | industrial: anvil and metal percussion, distorted bass, steam | 132, D minor |
| `hive` "The Walls Are Moving" | THE HIVE, sector 03 | infested: scuttling and legs for percussion, insect chatter, a tune that crawls by semitones, swung | 126, F♯ minor |
| `vault` "Time Lock" | THE VAULT, sector 04 | cold and crystalline: sung bowls, a plucked zither's arpeggios, glass bells, a timer's ticks and a lock's clicks for the time lock | 118, B minor |
| `void` "Falling Upward" | THE VOID, sector 05 | vast, and pulling: a bass and chords that slide into each other, a tune that falls while every phrase starts higher, a piano, a far choir, strings, stars | 140 (half-time when calm), C minor |
| `archive` "Struck From the Record" | THE ARCHIVE, fracture i | redacted: a tune that is the same shape on every shelf (three knocks, then the piece taken down) over a ground that steps down and never arrives; notes struck out that come back once as ghosts, tape-stops, deleted beats; an old upright, paper for percussion | 124, E minor |
| `mirror` "Once From Each Side" | THE MIRROR, fracture ii | one tune seen in a mirror three ways, all in key: upside down, backwards, and its struck glass notes played backwards; broken glass for percussion; its second fight section is its first played backwards, note for note | 128, A minor |
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
| `warden` "The First Wall" | THE WARDEN | the first wall: metal riff on the main theme, live drums | 160, A minor |
| `forgeheart` "Struck While Hot" | FORGEHEART | furnace metal: brass hits, hammered percussion | 165, D minor |
| `broodmother` "Mother of Thousands" | BROODMOTHER | nu-metal bounce on the hive's tune, a creeping choir, skittering hi-hats, her brood scuttling through it | 145, F♯ minor |
| `archivist` "Filed Under Lost" | THE ARCHIVIST | baroque and breaking: a harpsichord subject down the circle of fifths, staccato strings, a typewriter for hats, a record that skips | 170, B minor |
| `null` "The Schedule Says It Is Time" | NULL | the act-one finale: a statement with no drums, the main theme at half speed and then full, each sector's tune for four bars on its own instrument, THE VOID's tune sung under the theme's answer | 150, C minor |
| `curator` "A Piece Short" | THE CURATOR | stately: THE ARCHIVE's tune set out as a waltz, a string quartet over iron; the ground goes down by semitones in the last phase, and its last bar is not there | 150 in three-four, E minor |
| `other` "Your Reflection" (your title) | THE OTHER | the first song, Entry Vector, in the glass and gone wrong, and less of it yours the further it goes: its opening with every other bar backwards; its fight with the theme's reflection against it; the reflection alone; then a tune of its own, a palindrome | 160, A minor |
| `corrupt` "Your Reflection (Corrupted)" | the corrupted OTHER | the same song with something else in it: faster, every B a B flat, the leads crushed, a low voice under them that was never there, notes sticking | 176, A minor with a B flat |
| `keeper` | THE BOOKKEEPER | baroque metal: harpsichord and guitars, ledger ticking | 168, F minor |
| `shopkeeper` | THE SHOPKEEPER | jazz-metal: walking bass, ka-ching percussion | 180 swung, E♭ minor |
| `unwritten` | THE UNWRITTEN | a blank page: sparse piano that writes itself into a full orchestra | 120→180, C minor |
| `amalgam` "Made of Favourites" | THE AMALGAM (EMBER's rite) | a suite bolted together in the order he builds the body: its own walk, then one motif from each act-one boss (THE WARDEN's riff, FORGEHEART's hammer, BROODMOTHER's long line, THE ARCHIVIST's chorale, NULL's rising statement), a quiet middle of its own, and the main theme to finish | 140 (half-time until the finale), D minor |
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
- **Tracks stream in bar-aligned pieces.** Each track is cut into short Ogg
  Opus pieces (two or four bars) that the engine starts one after another,
  each exactly on its bar line. A piece holds only the notes that begin in
  its own bars and keeps going for as long as they ring (a reverb, a crash),
  under whichever piece comes next. So any piece can follow any other,
  loops have no gap, sections change on a bar line, and nothing is ever cut
  off. Only about four pieces are decoded at once (about 15 MB, where a
  whole decoded track would hold 50). A manifest (`music/manifest.json`)
  lists each track's BPM, pieces, sections and moods.
- **Changes are musical.** A boss arriving cuts to its `boss-in` sting and
  the boss track on the next beat. Phases move on a bar line. Leaving a
  room crossfades.
- **A sector's calm and fight each play their section out.** The game's
  fight-or-calm turns with every wave (it is "six or more enemies, in a
  wave"), so when either could cut in on any piece the music kept jumping
  between the two and starting each one over (your report, 12 Oct). Now a
  section, once begun, is heard to its last bar (sixteen bars, about half a
  minute), and the mood is only asked there. `studio/build.py` marks every
  section of a calm-and-fight track `lock` in the manifest; the engine
  already knew the word, so the game's own code did not change.
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

- **Composing in code.** Each track is a score file (`studio/scores/`:
  notes, drum patterns, sections, the mix) and a renderer in Python
  (`studio/daw.py`, `studio/inst.py`) turns it into audio. The renderer is
  a small DAW: oscillators and filters, a sampler for the raw one-shots,
  guitars double-tracked from separate takes, reverb, delay, sidechain, a
  clipper and a limiter. `studio/build.py <cue>` cuts the result into its
  pieces, encodes Opus at about 96 kbit/s, and writes the manifest;
  `studio/sfx.py` builds the effects.
- **Nobody here can hear it.** I check a mix by numbers: `studio/look.py`
  prints every instrument's level per section, the spectrum, how much is
  left for a laptop speaker (nothing under 200 Hz), and what tempo and key
  an analysis hears in the result. The files are also decoded again and
  laid out as the game lays them, and have to match the mix. You are the
  ears: `studio/listen.html` (through the worktree's static server) plays
  the real files, with the moods, the sting and the effects on buttons.
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
  (11 Oct: you moved to a Creator plan and said to use the whole library, so
  I no longer ask per batch; each step's report says how many were spent.
  Splice also caps downloads at 100 a day.) Splice gives no previews through
  the connector, so samples are chosen by their descriptions and measured
  after download (`studio/probe.py`); a few will turn out unusable.

### Levels (to settle at the mix, step 11)

- The game's effects are quiet: a shot peaks about 30 dB under full scale, a
  boom about 16. A mastered track at full level would bury them, so the
  music bus sits at `MUSIC_LEVEL` 0.16 (a sector plays near −28 dBFS, a boss
  near −26) and the recorded effects are set a little hotter than the blips
  they replace. The synth effects not yet replaced sit under the music more
  than they did under the old bed; the MUSIC slider is the remedy until
  steps 9–10.
- An open question for step 11: the whole game uses under half of the
  loudness it could. Raising everything together (with a limiter on the
  output) would help on a Chromebook's speakers, and would be a change every
  player hears on the day it ships.
- Chromebook speakers play nothing under about 200 Hz. Every mix is checked
  for what is left without it (the kick's click, the bass's harmonics, the
  guitars), and the references' "90% under 250 Hz" is not copied.

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
   *(done 11 Oct: `Music` and `Sfx` in index.html after `Audio_`;
   `npm run test:music` runs the director against a fake Web Audio clock;
   `npm test` and `npm run test:lockstep` unchanged.)*
3. **The studio and the first slice.** The renderer, the shared kit, and
   `grid` + `warden`, the `boss-in` sting, and four effects (VOIDRUNNER's
   shot, EMBER's lance, a hit, the codex opening). *(done 11 Oct, 32 credits.
   `grid` is "Entry Vector", `warden` "The First Wall". You asked for the
   lance to be more of a laser and less of a wave: rebuilt. The player's
   pieces changed from crossfaded cuts to pieces that ring out, see above.)*

   **From here (your call, 11 Oct): the sectors first, one at a time, each
   track named; the full determinism, lockstep and live passes run once at
   the end, not per step.** ALL HALLOWS (below) waits for your word; its
   chapter II opens 14 Oct.
4. **ALL HALLOWS.** `patch`, `backlog`, `house`, `deadgame`, `vigil`, and
   `yard` + `ragequit` once chapter III is built. It's early on purpose:
   chapter II opens 14 Oct and chapter III 23 Oct.
5. **The sectors.** `foundry`, `hive`, `vault`, `void` and their bosses.
   *(11 Oct: `foundry` "The Line Never Stops" and `forgeheart` "Struck While
   Hot" done, 13 more credits: anvils, hammer strikes, clangs, low brass.
   THE FOUNDRY has its own tune, a machine's 3 + 3 + 2; its struck metal is
   retuned to ring in D minor.)*
   *(11 Oct: `hive` "The Walls Are Moving" and `broodmother` "Mother of
   Thousands" done, 22 more credits. You asked for it more infested, with
   scuttling: a spider's steps and a scuttle replayed lower and slower, a
   "legs" instrument that taps in bursts, guiro and cabasa where hats would
   be, insect chatter under everything, a ghost choir. Swing came with it
   (`Song(swing=...)`).)*
   *(11 Oct: `vault` "Time Lock" and `archivist` "Filed Under Lost" done, 29
   more credits: sung bowls, a zither, harpsichord, string stabs, pizzicato,
   kettledrums, a typewriter, a timer, a lock, crystal. Splice's daily cap
   is nearly spent (4 left until about 19:40Z on 12 Oct).)*
   *(11 Oct: `void` "Falling Upward" and `null` "The Schedule Says It Is
   Time" done, the last 4 credits of the day: an octave string section and
   three notes of an upright piano. You added a 24th reference, Galactic
   Destruction, and asked for these two to take after it: see "The 24th
   reference" below. Both moved off the tempos first planned (100 and
   175). Act one is complete. Next: THE FRACTURE.)*
   *(12 Oct, after you listened: NULL's second phase had two passages
   that did not fit, THE HIVE's crawl by semitones and THE ARCHIVIST's
   baroque run. Both now use the slow form of the same tunes (the brood's
   long line; the subject at two notes a bar), sung by NULL's own lead and
   strings over its pulse. THE ARCHIVIST gained a four-bar intro, since it
   was too chaotic to start on. A boss track may open with one.)*
   *(12 Oct: shipped as 1.6, "the soundtrack, disk one", at your word and
   without the long test passes: the determinism and lockstep suites have
   not run since step 2 and are still owed before the last ship. Checked
   for this one: the engine test, a boot in a browser with both new boss
   intros playing through, and the live files on both addresses.)*
   *(12 Oct: a bonus for disk one, at your request: `amalgam` "Made of
   Favourites". Your brief: one well-made song out of the other boss
   themes, with sections of its own between them; epic, not cluttered;
   motifs, not passages. So every motif is in D minor and on this track's
   own band (one lead, strings under it, guitars, a choir), one idea at a
   time, and the fast forms of the tunes are left out. The fight is held to
   a hundred seconds at least and the song takes 117 to come round, so it
   plays through once in a fight; the game asks only for `p1`, and the
   sections follow each other by `next`. No new samples. Not shipped yet.)*
6. **THE FRACTURE**, which you named disk two, "Cracks in the Plane".
   `archive`, `curator`, `mirror`, `other`, `leak`, `recursion`, `halt`,
   the `intrusion` sting, `rootroom`, `root`.
   *(12 Oct: `archive` "Struck From the Record" and `curator` "A Piece
   Short" done, with no new samples: Splice's day was spent. The studio
   learned three-four (`Song(beats=3, steps=12)`) for THE CURATOR's waltz,
   and a tape-stop. You heard a guitar clashing with the tune in the calm
   section: it was two recordings that are not what their names say, a
   "cello" that is a major-sixth chord and a zither "open fifth" that
   strums a major chord a tone low before it lands. Both are out of these
   two tracks, and `look.py --notes` now lists the notes sounding in each
   bar and flags any outside the key, so the next one is caught before you
   hear it. Not shipped yet.)*
   *(12 Oct: `mirror` "Once From Each Side", `other` "Your Reflection" and
   `corrupt` "Your Reflection (Corrupted)" done. Your brief: glass shard
   effects, and play with reversing the music while keeping it pleasing;
   then, for THE OTHER, your title, "a more chaotic version of the first
   song that gets more unique the further it goes", and a corrupted
   counterpart. The glass is four recordings you added to your library
   (Splice's cap was on my side): a bottle, a vase whose pieces are cut
   into single shards, and two of debris. Reversing is done three ways that
   stay in key: `flip()` turns a line upside down within the scale,
   `retro()` and `backward()` play a line or a whole section backwards, and
   `inst.backwards()` plays an instrument's notes backwards. I took "the
   first song" to be Entry Vector. The corrupted OTHER is the one change to
   the game's own code: `musicWant` picks `corrupt` when the boss on the
   floor has the virus. Not shipped yet.)*
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

All 23 first reference tracks (the four from Downloads and the 19 in
`C:\ref. music`) were listened to with the music-analysis skill's full
listen and an arrangement profile of my own, 11 Oct. Loudness is a gated RMS
in dBFS (close enough to compare the tracks with each other); "low" is the
share of the power under 250 Hz; "air" is the share above 4 kHz; "perc" is
the drum share (HPSS); "quiet" is the seconds spent below a quarter of the
track's own peak energy, which is how much of it is breakdown.

| # | track | length | tempo | key | loud | low | air | perc | quiet |
|---|---|---|---|---|---|---|---|---|---|
| 1-01 | The Tale of a Cruel World | 4:21 | 129 | C minor | −15.0 | .27 | .00 | .04 | 52 s |
| 1-02 | wasteland | 6:21 | 129 | D major | −12.1 | .90 | .00 | .10 | 132 s |
| 1-03 | Guardian of The Former Seas | 4:34 | 96 (×2) | F minor | −10.3 | .76 | .02 | .14 | 20 s |
| 1-04 | 1NF3$+@+!0N | 4:34 | 152 | F♯ minor | −8.5 | .86 | .03 | .18 | 8 s |
| 1-05 | The Filthy Mind | 4:17 | 112 | D minor | −10.9 | .64 | .03 | .27 | 28 s |
| 1-06 | Blood Coagulant | 5:04 | 123 | G♯ minor | −10.8 | .70 | .04 | .33 | 8 s |
| 1-07 | Hadopelagic Pressure | 4:27 | 117 | E minor | −9.4 | .75 | .01 | .13 | 44 s |
| 2-03 | Left Alone | 5:14 | 112 | D♯ minor | −10.2 | .63 | .01 | .14 | 4 s |
| 2-05 | Silence before the storms | 3:36 | 117 | A minor | −14.6 | .77 | .00 | .04 | 164 s |
| 2-11 | Open Frenzy | 5:00 | 112 | F minor | −8.9 | .71 | .03 | .14 | 8 s |
| 3-02 | Murderswarm | 3:23 | 103 | A minor | −11.5 | .65 | .07 | .15 | 20 s |
| 3-03 | Unholy Insurgency | 5:18 | 117 | G minor | −8.8 | .59 | .08 | .20 | 12 s |
| 3-04 | Servants of The Scourge | 5:50 | 96 (×2) | G♯ minor | −9.8 | .70 | .04 | .17 | 24 s |
| 3-05 | Feral Amalgamation | 5:18 | 89 | D major | −9.5 | .65 | .04 | .18 | 8 s |
| 3-06 | void | 6:48 | 123 | B major | −15.2 | .40 | .00 | .05 | 176 s |
| 3-07 | Scourge of The Universe | 7:38 | 96 (×2) | C♯ minor | −11.2 | .49 | .05 | .17 | 52 s |
| 3-08 | UNIVERSAL COLLAPSE | 4:16 | 99 | D♯ minor | −9.5 | .52 | .05 | .14 | 8 s |
| 3-09 | Infernal Catharsis (Rebirth) | 8:00 | 103 | E minor | −11.3 | .66 | .05 | .15 | 12 s |
| 3-10 | Roar of The Jungle Dragon | 8:24 | 123 | C♯ minor | −12.0 | .58 | .04 | .14 | 24 s |
| 3-11 | Stained, Brutal Calamity | 12:14 | 117 | F minor | −11.3 | .61 | .03 | .09 | 180 s |
| 3-12 | Pest of The Cosmos | 4:07 | 129 | C♯ minor | −8.6 | .80 | .02 | .19 | 8 s |
| 4-01 | Cosmic Disgust | 3:55 | 129 | C♯ minor | −8.9 | .73 | .02 | .17 | 32 s |
| 4-02 | Threats of The Ocean Floor | 4:00 | 162 | E minor | −11.0 | .77 | .02 | .10 | 28 s |
| + | Galactic Destruction | 4:41 | 140 | B minor | −10.2 | .71 | .02 | .13 | 4 s |

### What 23 tracks say that 4 did not

- **Three weights, now confirmed.** Three tracks sit at −15 (the calm
  ones: 1-01, 2-05, 3-06), and two of them are the only really wide ones
  (stereo width 0.83 and 0.88; everything else is 0.25–0.57, narrow and
  heavy). Five are −8.9 or louder and are walls from the first bar. The
  rest sit between −12 and −9.4.
- **Four tracks are mostly waiting.** Over 130 s below quarter energy:
  wasteland, Silence before the storms, void, Stained Brutal Calamity.
  Nine are walls with 12 s of rest or less. The score should have both, and
  the sectors are where the long breaths go.
- **The highs stay dark everywhere.** No track has more than 8% of its
  power above 4 kHz (the brightest, Unholy Insurgency, has 8%). Dark mixes
  with the top rolled off are the signature, not a limitation.
- **Low end rules.** 27% under 250 Hz in the calm piece; 40–90% in the rest.
- **Keys:** 20 of 23 are minor, and the sharp keys (C♯, D♯, F♯, G♯) are
  nine of them. Three are major but bittersweet (wasteland, void, Feral
  Amalgamation). Several measure at 96, 99 or 103 BPM and may be a
  double-time feel (about 190 to 206), so a fight's "tempo" is a half-time
  grid with fast hats.
- **Dynamics:** crest factors run 9.3 dB (heavily limited) to 15 dB. The
  master limiter in the studio targets about 10 dB crest for fights and
  12–15 for sectors and calm.

### The 24th reference: Galactic Destruction

Added on 11 Oct for THE VOID and NULL, and looked at more closely than the
others (bar by bar: chords, bass, drums, and close-up pictures of five
passages). What it does, and so what those two tracks take from it:

- **It states itself before any drums.** Six bars at full power: thick
  chords over a bass that climbs a step a bar (B, C♯, D, E), then the drums.
  NULL opens the same way, on its own notes; THE VOID's tune climbs.
- **Everything slides.** The bass and the chords bend from each note into
  the next. THE VOID's hazard is gravity wells, so this became the
  sector's sound: the synth has a `slide` on every chord change.
- **Long notes over a busy middle.** The lead holds whole bars while a
  syncopated figure runs under it in the middle register.
- **A stretch with no drums in the middle** (ten bars: held, sliding chords
  and something twinkling above them), still loud. NULL's second phase
  starts with four such bars: the lore says it "stops the room".
- **A peak that walks down four chords** (i, VII, VI, v) under fast runs,
  then a climb, then ten thin bars on one note before the loop. NULL's
  last phase ends with a run down four chords and four bars held on C.
- **The form is a 72-bar loop** after an 8-bar opening, with phrases of 14
  and 10 bars. Wide in the middle (side/mid 0.7 to 0.8), narrow in the sub.

Nothing of its melody, bass line or drum patterns is used: the notes are
the game's own (THE VOID's tune; the main theme, moved to C minor).

### The nearest reference for each cue

A starting point for the studio, chosen by the measurements and the feel
(tempo, key, weight, how much of it breathes); never copied. The title and
the sound of a track are not why it was picked, with one exception: where a
track's name is the cue's name, it was the obvious first listen.

| cue(s) | nearest | what to take |
|---|---|---|
| `title`, `hub`, `codex`, `library`, `stands` | 1-01 Tale of a Cruel World | sparse keys, then the ensemble, three swells, almost no drums |
| `planetarium` | 3-06 void | the widest and softest piece; 40% low end, no air at all; long drift |
| `void`, `null` | Galactic Destruction | see above; `void`'s calm section still takes its room from 3-06 void |
| `vigil`, `halt` | 2-05 Silence before the storms | three quarters of it is waiting; an ascending arc |
| `grid` | 1-02 wasteland | grid-locked, 90% low end, two real breakdowns, the opener's template |
| `foundry` | 1-05 The Filthy Mind | the most percussive of the area tracks; D minor, 112 |
| `hive` | 1-06 Blood Coagulant | drum-forward and skittering; 123 against 126 |
| `vault` | 1-07 Hadopelagic Pressure | sub-heavy and cold; 117 against 118; 44 s of rest |
| `archive`, `recursion` | 3-10 Roar of The Jungle Dragon, 2-03 Left Alone | long restless cycles that return; a loop that never resolves |
| `mirror`, `pvp` | 4-01 Cosmic Disgust | tight and narrow at 129; a mountain shape |
| `leak` | 3-12 Pest of The Cosmos | the lowest energy variance of any track: relentless |
| `rootroom`, `root` | 1-04 1NF3$+@+!0N | 152 against 150; sub sweeps, drum-break breakdowns |
| `warden` | 1-03 Guardian of The Former Seas | full force from bar one, short resets as phase changes |
| `forgeheart` | 3-03 Unholy Insurgency | the brightest and most percussive of the walls: brass and hammer |
| `broodmother` | 3-02 Murderswarm | short, narrow and bright; a groove that creeps |
| `archivist`, `other` | 4-02 Threats of The Ocean Floor | the fastest track at 162; E minor, with a double-time feel |
| `unwritten` | 3-09 Infernal Catharsis, 1-01 Tale of a Cruel World | a mountain: it builds for minutes; the sparse start into the ensemble |
| `curator`, `tribunal` | 3-04 Servants of The Scourge, 3-08 UNIVERSAL COLLAPSE | a slow-burning full ensemble; the steadiest of the fights (energy variance .17) |
| `keeper` | 2-11 Open Frenzy | F minor at 112, which is 168 in the cue's feel |
| `shopkeeper` | 1-06 Blood Coagulant | the swung, drum-forward one |
| `amalgam` | 3-05 Feral Amalgamation | D major at 89 and 117: the slow-then-fast cue |
| `founder` | 3-07 Scourge of The Universe | 96 in half-time, a long arc with a breakdown |
| `onepointoh`, `rush` | 3-11 Stained, Brutal Calamity | 12 minutes and several distinct movements: a suite |
| `ragequit` | 3-12 Pest of The Cosmos | the loudest wall |
| ALL HALLOWS (`patch`, `house`, `yard`, `backlog`, `deadgame`) | 3-02, 3-04, 3-06, 3-09, 2-03 | in that order: swarm, slow doom, vast, finale, a loop that is left alone |

Tools: the music-analysis skill's full listen (run under a venv, since
numba crashes against numpy 2.4 on this machine), plus an arrangement
profile (spectrogram, energy and percussive share per 4 s, band balance,
loudness, stereo width).
